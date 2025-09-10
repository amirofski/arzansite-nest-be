#!/usr/bin/env node

/**
 * scripts/appwrite-verify.js
 *
 * Verifies your Appwrite Database, Collections, and Attributes based on:
 * - Environment variables (APPWRITE_*), especially APPWRITE_COLLECTION_*_ID
 * - Inferred attribute keys from docs/analysis/appwrite-inferred-attributes.json
 *
 * By default, this script is non-destructive and will NOT create anything.
 * Use --apply to create missing database/collections/attributes idempotently.
 * It will never create duplicates because it targets exact IDs from env.
 */

const fs = require('fs');
const path = require('path');
const tryRequire = (m) => { try { return require(m); } catch { return null; } };
const dotenv = tryRequire('dotenv');
if (dotenv) dotenv.config();

const sdk = tryRequire('node-appwrite');
if (!sdk) {
  console.error('node-appwrite is not installed. Please `npm i node-appwrite` and re-run.');
  process.exit(1);
}

const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    argMap[key] = val;
  }
}
const APPLY = !!argMap.apply;

function envAny(...keys) {
  for (const k of keys) {
    if (process.env[k]) return process.env[k];
  }
  return null;
}

const OUT_DIR = path.resolve(process.cwd(), 'docs', 'analysis');
const INFERRED_PATH = path.join(OUT_DIR, 'appwrite-inferred-attributes.json');

const ENDPOINT = envAny('APPWRITE_ENDPOINT');
const PROJECT = envAny('APPWRITE_PROJECT_ID', 'APPWRITE_PROJECT');
const API_KEY = envAny('APPWRITE_API_KEY');
const DB_ID = envAny('APPWRITE_DATABASE_ID', 'APPWRITE_DB_ID', 'APPWRITE_DB');

if (!ENDPOINT || !PROJECT || !API_KEY) {
  console.error('Missing required Appwrite envs. Ensure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY are set.');
  process.exit(2);
}
if (!DB_ID) {
  console.error('Missing database id. Set APPWRITE_DATABASE_ID (or APPWRITE_DB_ID/APPWRITE_DB).');
  process.exit(3);
}

function collectEnvCollections() {
  const map = {};
  for (const [k, v] of Object.entries(process.env)) {
    let m = k.match(/^APPWRITE_COLLECTION_([A-Z0-9_]+)_ID$/i);
    if (m && v) {
      const slug = m[1].toLowerCase();
      map[slug] = { id: v, name: envAny(`APPWRITE_COLLECTION_${m[1]}_NAME`) || slug };
      continue;
    }
    m = k.match(/^APPWRITE_COLLECTION_([A-Z0-9_]+)$/i);
    if (m && v) {
      const slug = m[1].toLowerCase();
      map[slug] = { id: v, name: envAny(`APPWRITE_COLLECTION_${m[1]}_NAME`) || slug };
      continue;
    }
  }
  return map; // { slug: {id, name} }
}

function loadInferred() {
  if (!fs.existsSync(INFERRED_PATH)) return {};
  return JSON.parse(fs.readFileSync(INFERRED_PATH, 'utf8'));
}

function slugFromExpr(expr) {
  if (!expr) return null;
  const parts = String(expr).split(/\.|\[|\]/).map((s) => s.replace(/['\"]/g, '').trim()).filter(Boolean);
  if (!parts.length) return null;
  return parts[parts.length - 1].toLowerCase();
}

function normalizeSlug(s) {
  if (!s) return '';
  const lc = String(s).toLowerCase();
  return lc.replace(/collection$/, '').replace(/[^a-z0-9]/g, '');
}

function buildCollectionAttributeMap(envCols, inferred) {
  const map = {}; // { id: { slug, name, attributes: Set<string>, sources: string[] } }
  const envIndex = Object.fromEntries(Object.entries(envCols).map(([slug, info]) => [slug, { info, norm: normalizeSlug(slug) }]));
  for (const [slug, info] of Object.entries(envCols)) {
    map[info.id] = { slug, name: info.name, attributes: new Set(), sources: [] };
  }
  for (const [expr, meta] of Object.entries(inferred)) {
    const slug = slugFromExpr(expr);
    if (!slug) continue;
    const exprNorm = normalizeSlug(slug);
    // direct
    if (envCols[slug]) {
      const bucket = map[envCols[slug].id];
      for (const k of meta.keys || []) bucket.attributes.add(k);
      bucket.sources.push(expr);
      continue;
    }
    // normalized includes
    const candidates = Object.entries(envIndex).filter(([s, o]) => o.norm.includes(exprNorm) || exprNorm.includes(o.norm));
    if (candidates.length === 1) {
      const matched = candidates[0][1].info;
      const bucket = map[matched.id];
      for (const k of meta.keys || []) bucket.attributes.add(k);
      bucket.sources.push(expr);
      continue;
    }
    // plural/singular fallback
    const singular = exprNorm.endsWith('s') ? exprNorm.slice(0, -1) : null;
    if (singular) {
      const candidates2 = Object.entries(envIndex).filter(([s, o]) => o.norm.includes(singular) || singular.includes(o.norm));
      if (candidates2.length === 1) {
        const matched = candidates2[0][1].info;
        const bucket = map[matched.id];
        for (const k of meta.keys || []) bucket.attributes.add(k);
        bucket.sources.push(expr);
      }
    }
  }
  return map;
}

async function ensure() {
  const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT)
    .setKey(API_KEY);

  const databases = new sdk.Databases(client);

  const envCols = collectEnvCollections();
  const inferred = loadInferred();
  const colAttrMap = buildCollectionAttributeMap(envCols, inferred);

  const report = {
    generatedAt: new Date().toISOString(),
    databaseId: DB_ID,
    endpoint: ENDPOINT,
    project: PROJECT,
    apply: APPLY,
    collections: {},
    summary: { created: { database: false, collections: [], attributes: [] }, missing: { database: false, collections: [], attributes: [] } },
  };

  // Database
  let dbExists = true;
  try {
    await databases.get(DB_ID);
  } catch (e) {
    dbExists = false;
    report.summary.missing.database = true;
    if (APPLY) {
      try {
        await databases.create(DB_ID, 'App Database');
        report.summary.created.database = true;
        dbExists = true;
      } catch (err) {
        report.databaseError = String(err?.message || err);
      }
    }
  }

  // Collections
  for (const [id, meta] of Object.entries(colAttrMap)) {
    report.collections[id] = { slug: meta.slug, name: meta.name, exists: false, attributes: { existing: [], missing: [] }, errors: [] };
    let colExists = true;
    try {
      await databases.getCollection(DB_ID, id);
      report.collections[id].exists = true;
    } catch (e) {
      colExists = false;
      report.summary.missing.collections.push({ id, name: meta.name });
      if (APPLY) {
        try {
          await databases.createCollection(DB_ID, id, meta.name);
          report.summary.created.collections.push({ id, name: meta.name });
          colExists = true;
          report.collections[id].exists = true;
        } catch (err) {
          report.collections[id].errors.push(String(err?.message || err));
        }
      }
    }

    // Attributes
    if (colExists) {
      let existingAttrs = [];
      try {
        // Appwrite v14
        const attrList = await databases.listAttributes(DB_ID, id);
        existingAttrs = (attrList?.attributes || []).map((a) => a.key || a.$id).filter(Boolean);
      } catch (e) {
        // fallback: try getCollection
        try {
          const col = await databases.getCollection(DB_ID, id);
          existingAttrs = (col?.attributes || []).map((a) => a.key || a.$id).filter(Boolean);
        } catch (e2) {
          report.collections[id].errors.push('Unable to read attributes: ' + String(e2?.message || e2));
        }
      }
      const need = Array.from(meta.attributes);
      const missing = need.filter((k) => !existingAttrs.includes(k));
      report.collections[id].attributes.existing = existingAttrs;
      report.collections[id].attributes.missing = missing;

      if (APPLY && missing.length) {
        for (const k of missing) {
          try {
            // Heuristics for attribute types
            const keyLower = k.toLowerCase();
            if (/^(is_|has_|enabled|active)/.test(keyLower)) {
              await databases.createBooleanAttribute(DB_ID, id, k, false);
            } else if (/(amount|price|total|balance|count|number|qty|quantity)$/i.test(k)) {
              await databases.createIntegerAttribute(DB_ID, id, k, false);
            } else if (/(created_at|updated_at|date|_at)$/i.test(k)) {
              await databases.createDatetimeAttribute(DB_ID, id, k, false);
            } else if (/(email)$/i.test(k)) {
              await databases.createEmailAttribute(DB_ID, id, k, false);
            } else if (/(phone|mobile)$/i.test(k)) {
              await databases.createStringAttribute(DB_ID, id, k, 32, false);
            } else if (/(status|type|method|provider)$/i.test(k)) {
              await databases.createStringAttribute(DB_ID, id, k, 64, false);
            } else if (/(id)$/i.test(k)) {
              await databases.createStringAttribute(DB_ID, id, k, 64, false);
            } else {
              await databases.createStringAttribute(DB_ID, id, k, 255, false);
            }
            report.summary.created.attributes.push({ collectionId: id, key: k });
          } catch (err) {
            report.collections[id].errors.push(`Create attribute ${k} failed: ${String(err?.message || err)}`);
          }
        }
      } else if (missing.length) {
        report.summary.missing.attributes.push(...missing.map((k) => ({ collectionId: id, key: k })));
      }
    }
  }

  // Write report
  const reportPath = path.join(OUT_DIR, 'appwrite-verify-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log((APPLY ? 'Verification+apply' : 'Verification') + ' complete. Report: ' + reportPath);
}

ensure().catch((e) => {
  console.error('Fatal error:', e?.message || e);
  process.exit(10);
});

