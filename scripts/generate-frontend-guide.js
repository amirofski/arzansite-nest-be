#!/usr/bin/env node

/**
 * scripts/generate-frontend-guide.js
 *
 * Reads docs/analysis/endpoints.json and produces docs/analysis/frontend-api-guide-full.md
 * with example requests for fetch/axios, parameter listings, and body shapes inferred
 * from DTO metadata where available.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(process.cwd(), 'docs', 'analysis');
const ENDPOINTS_PATH = path.join(OUT_DIR, 'endpoints.json');
const OUT_PATH = path.join(OUT_DIR, 'frontend-api-guide-full.md');

function readEndpoints() {
  const raw = fs.readFileSync(ENDPOINTS_PATH, 'utf8');
  return JSON.parse(raw);
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {});
}

function sampleBodyFromDTO(ep) {
  if (ep.bodyDTO && ep.bodyDTO.props && ep.bodyDTO.props.length) {
    const obj = {};
    for (const p of ep.bodyDTO.props) obj[p.name] = `(${p.type || 'any'})`;
    return obj;
  }
  return ep.bodyType ? { type: ep.bodyType } : null;
}

function main() {
  const endpoints = readEndpoints();
  const byController = groupBy(endpoints, 'controller');
  const lines = [];
  lines.push('# Frontend API Guide (Comprehensive)');
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Base URL: {{API_BASE_URL}}');
  lines.push('Auth: Bearer {{ACCESS_TOKEN}} where required');
  lines.push('');

  for (const [controller, eps] of Object.entries(byController)) {
    lines.push(`## ${controller}`);
    lines.push('');
    const sorted = eps.slice().sort((a,b)=> (a.fullPath||'').localeCompare(b.fullPath||'') || a.method.localeCompare(b.method));
    for (const ep of sorted) {
      const fullPath = ep.fullPath || `/${[ep.basePath, ep.path].filter(Boolean).join('/')}`;
      lines.push(`### ${ep.method} ${fullPath}`);
      if (ep.summary && String(ep.summary).trim()) {
        lines.push('Summary:');
        lines.push('');
        lines.push('```');
        lines.push(String(ep.summary));
        lines.push('```');
      }
      // Params
      const pathParams = (ep.params || []).filter((p) => p.in === 'Param');
      const queryParams = (ep.params || []).filter((p) => p.in === 'Query');
      if (pathParams.length) {
        lines.push('Path params:');
        for (const p of pathParams) lines.push(`- ${p.arg || p.name}: ${p.type}`);
      }
      if (queryParams.length) {
        lines.push('Query params:');
        for (const p of queryParams) lines.push(`- ${p.arg || p.name}: ${p.type}`);
      }
      // Request body
      const body = sampleBodyFromDTO(ep);
      if (body) {
        lines.push('Request body example:');
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(body, null, 2));
        lines.push('```');
      }

      // Fetch example
      lines.push('Client example (fetch):');
      const hasBody = !!body;
      const method = ep.method || 'GET';
      const urlExpr = `\`${fullPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '${$1}') }\``;
      const fetchBody = hasBody ? `\n  body: JSON.stringify(${JSON.stringify(body)})` : '';
      lines.push('');
      lines.push('```js path=null start=null');
      lines.push(`async function call_${controller}_${ep.methodName || 'endpoint'}(params, token) {`);
      if (pathParams.length) lines.push(`  // params: { ${pathParams.map((p)=>p.arg||p.name).join(', ')} }`);
      lines.push(`  const res = await fetch(\`${'${API_BASE_URL}'}${fullPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '${params.$1}') }\`, {`);
      lines.push(`    method: '${method}',`);
      lines.push('    headers: {');
      lines.push("      'Content-Type': 'application/json',");
      lines.push("      ...(token ? { Authorization: `Bearer ${token}` } : {}),");
      lines.push('    },');
      if (hasBody) lines.push(`    body: JSON.stringify(${JSON.stringify(body)}),`);
      lines.push('  });');
      lines.push('  if (!res.ok) throw new Error(`HTTP ${res.status}`);');
      lines.push('  return await res.json().catch(() => ({}));');
      lines.push('}');
      lines.push('```');
      lines.push('');
    }
    lines.push('');
  }

  fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
  console.log('Generated:', OUT_PATH);
}

main();

