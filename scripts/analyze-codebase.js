#!/usr/bin/env node

/**
 * analyze-codebase.js
 *
 * Generates:
 * - docs/analysis/codebase-map.json: Tree map of files, functions, classes, imports, and relationships
 * - docs/analysis/endpoints.json: Structured list of API endpoints extracted from NestJS controllers
 * - docs/analysis/frontend-api-guide.md: Human-readable guide for frontend with endpoints and payload/response shapes
 * - docs/analysis/llm_context.md: LLM-friendly summary combining key artifacts
 *
 * It uses the TypeScript compiler API if available for robust parsing. If TypeScript is not available,
 * it falls back to a regex-based parser for a best-effort extraction.
 */

const fs = require('fs');
const path = require('path');

const tryRequire = (name) => {
  try {
    return require(name);
  } catch (e) {
    return null;
  }
};

const ts = tryRequire('typescript');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.turbo',
  '.cache',
  '.vscode',
]);

const DEFAULT_ROOT = path.resolve(process.cwd(), 'src');
const DEFAULT_OUT = path.resolve(process.cwd(), 'docs', 'analysis');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p, files);
    } else {
      if (/\.(ts|js|tsx|jsx|mjs|cjs)$/.test(entry.name)) {
        files.push(p);
      }
    }
  }
  return files;
}

function isRelativeImport(spec) {
  return spec.startsWith('./') || spec.startsWith('../');
}

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    return '';
  }
}

function printType(node, sourceFile) {
  if (!node) return 'any';
  if (ts) {
    try {
      return node.getText(sourceFile);
    } catch (e) {
      return 'any';
    }
  } else {
    return 'any';
  }
}

function gatherImportsTS(sourceFile, filePath) {
  const imports = [];
  sourceFile.forEachChild((node) => {
    if (ts && ts.isImportDeclaration(node)) {
      const mod = node.moduleSpecifier && node.moduleSpecifier.getText(sourceFile).replace(/^['"]|['"]$/g, '');
      if (mod) imports.push(mod);
    }
  });
  return imports;
}

function getDecoratorInfoTS(dec) {
  if (!ts) return null;
  try {
    let name = null;
    let args = [];
    if (ts.isCallExpression(dec.expression)) {
      const expr = dec.expression.expression;
      name = expr.getText();
      args = dec.expression.arguments.map((a) => a.getText());
    } else {
      name = dec.expression.getText();
    }
    return { name, args };
  } catch (e) {
    return null;
  }
}

function extractDTOsTS(sourceFile) {
  const dtos = {};
  if (!ts) return dtos;
  sourceFile.forEachChild((node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      const name = node.name.getText();
      if (/Dto$/i.test(name)) {
        const props = [];
        const extendsClause = node.heritageClauses?.find((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
        let extendsText = null;
        if (extendsClause && extendsClause.types?.length) {
          extendsText = extendsClause.types.map((t) => t.getText()).join(', ');
        }
        node.members.forEach((m) => {
          if (ts.isPropertyDeclaration(m) || ts.isPropertySignature?.(m)) {
            const propName = m.name?.getText?.() || 'unknown';
            const optional = !!m.questionToken;
            const type = printType(m.type, sourceFile);
            const decorators = (m.decorators || []).map(getDecoratorInfoTS).filter(Boolean);
            props.push({ name: propName, optional, type, decorators });
          }
        });
        dtos[name] = { name, props, extends: extendsText };
      }
    } else if (ts.isInterfaceDeclaration(node) && node.name) {
      const name = node.name.getText();
      if (/Dto$/i.test(name)) {
        const props = [];
        node.members.forEach((m) => {
          if (ts.isPropertySignature(m)) {
            const propName = m.name?.getText?.() || 'unknown';
            const optional = !!m.questionToken;
            const type = printType(m.type, sourceFile);
            props.push({ name: propName, optional, type, decorators: [] });
          }
        });
        dtos[name] = { name, props, extends: null };
      }
    }
  });
  return dtos;
}

function nameMatches(name, base) {
  if (!name) return false;
  return name === base || new RegExp(`(^|\\.)${base}$`).test(name);
}

function extractControllersAndEndpointsTS(sourceFile, filePath) {
  const controllers = [];
  if (!ts) return controllers;
  sourceFile.forEachChild((node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      const decorators = (node.decorators || []).map(getDecoratorInfoTS).filter(Boolean);
      // Robust check: @Controller, possibly qualified (e.g., common_1.Controller)
      const isController = decorators.some((d) => nameMatches(d.name, 'Controller'));
      if (isController) {
        const ctrlDec = decorators.find((d) => nameMatches(d.name, 'Controller'));
        const basePathArg = (ctrlDec?.args || [])[0];
        const basePath = basePathArg ? basePathArg.replace(/^['\"]|['\"]$/g, '') : '';
        const className = node.name.getText();
        const methods = [];
        node.members.forEach((m) => {
          if (ts.isMethodDeclaration(m) && m.name) {
            const mName = m.name.getText();
            const mDecs = (m.decorators || []).map(getDecoratorInfoTS).filter(Boolean);
            const httpDec = mDecs.find((d) => ['Get','Post','Put','Patch','Delete','Options','Head','All'].some((h) => nameMatches(d.name, h)));
            if (httpDec) {
              const httpName = ['Get','Post','Put','Patch','Delete','Options','Head','All'].find((h) => nameMatches(httpDec.name, h));
              const method = (httpName || httpDec.name || 'GET').toUpperCase();
              const methodPathArg = httpDec.args?.[0];
              const methodPath = methodPathArg ? methodPathArg.replace(/^['\"]|['\"]$/g, '') : '';
              // Params
              const params = [];
              (m.parameters || []).forEach((p) => {
                const pName = p.name?.getText?.() || 'param';
                const pType = printType(p.type, sourceFile);
                const pDecs = (p.decorators || []).map(getDecoratorInfoTS).filter(Boolean);
                const nestParam = pDecs.find((d) => ['Body','Param','Query','Headers','Req','Res'].some((h) => nameMatches(d.name, h)));
                const location = nestParam?.name ? (['Body','Param','Query','Headers','Req','Res'].find((h) => nameMatches(nestParam.name, h)) || nestParam.name) : 'Unknown';
                const argName = nestParam?.args?.[0]?.replace(/^['\"]|['\"]$/g, '') || null;
                params.push({ name: pName, type: pType, in: location, arg: argName });
              });
              // Swagger
              const apiOperation = mDecs.find((d) => nameMatches(d.name, 'ApiOperation'));
              const apiResponse = mDecs.find((d) => nameMatches(d.name, 'ApiResponse'));
              const apiResponses = mDecs.filter((d) => /(^|\.)Api.*Response$/.test(d.name || ''));
              const summaries = [];
              if (apiOperation?.args?.length) summaries.push(apiOperation.args[0]);
              const endpoint = {
                controller: className,
                file: filePath,
                basePath,
                method,
                path: methodPath,
                methodName: mName,
                summary: summaries.join(' '),
                params,
                responses: [],
              };
              if (apiResponse?.args?.length) endpoint.responses.push(apiResponse.args[0]);
              apiResponses.forEach((r) => endpoint.responses.push(...(r.args || [])));
              methods.push(endpoint);
            }
          }
        });
        controllers.push({ className, file: filePath, basePath, methods });
      }
    }
  });
  return controllers;
}

function extractFunctionsAndClassesTS(sourceFile) {
  const functions = [];
  const classes = [];
  if (!ts) return { functions, classes };
  sourceFile.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.getText();
      const params = (node.parameters || []).map((p) => ({ name: p.name?.getText?.() || 'param', type: printType(p.type, sourceFile) }));
      const returnType = printType(node.type, sourceFile);
      functions.push({ name, params, returnType, decorators: [] });
    } else if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.getText();
      const decorators = (node.decorators || []).map(getDecoratorInfoTS).filter(Boolean);
      const methods = [];
      node.members.forEach((m) => {
        if (ts.isMethodDeclaration(m) && m.name) {
          const mName = m.name.getText();
          const params = (m.parameters || []).map((p) => ({ name: p.name?.getText?.() || 'param', type: printType(p.type, sourceFile), decorators: (p.decorators || []).map(getDecoratorInfoTS).filter(Boolean) }));
          const returnType = printType(m.type, sourceFile);
          const mDecs = (m.decorators || []).map(getDecoratorInfoTS).filter(Boolean);
          methods.push({ name: mName, params, returnType, decorators: mDecs });
        }
      });
      classes.push({ name: className, decorators, methods });
    }
  });
  return { functions, classes };
}

function extractAppwriteOpsTS(sourceFile, filePath) {
  const ops = [];
  if (!ts) return ops;
  function visit(node) {
    if (ts.isCallExpression(node)) {
      let methodName = null;
      if (ts.isPropertyAccessExpression(node.expression)) {
        methodName = node.expression.name?.getText?.();
      }
      if (methodName && (methodName === 'createDocument' || methodName === 'updateDocument')) {
        const args = node.arguments || [];
        // v14 positional: dbId, collId, docId, data, ...
        const dbExpr = args[0]?.getText?.(sourceFile) || null;
        const collExpr = args[1]?.getText?.(sourceFile) || null;
        const dataArg = args[3];
        const keys = [];
        if (dataArg && ts.isObjectLiteralExpression(dataArg)) {
          for (const prop of dataArg.properties) {
            if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
              const k = prop.name?.getText?.(sourceFile) || null;
              if (k) keys.push(k.replace(/^['\"]|['\"]$/g, ''));
            }
          }
        }
        ops.push({ op: methodName, dbExpr, collExpr, dataKeys: keys, file: filePath });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return ops;
}

// Fallback regex-based extraction
function extractWithRegex(code, filePath) {
  const imports = [];
  const importRe = /import\s+[^'"\n]+['\"]([^'\"]+)['\"];?/g;
  let m;
  while ((m = importRe.exec(code))) imports.push(m[1]);

  const fnRe = /function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
  const functions = [];
  while ((m = fnRe.exec(code))) {
    const name = m[1];
    const params = (m[2] || '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => ({ name: p, type: 'any' }));
    functions.push({ name, params, returnType: 'any', decorators: [] });
  }

  const classes = [];
  const classRe = /@Controller\(([^)]*)\)[\s\S]*?class\s+([a-zA-Z0-9_]+)/g;
  while ((m = classRe.exec(code))) {
    const basePath = (m[1] || '').replace(/^['"]|['"]$/g, '');
    const className = m[2];
    const methods = [];
    const methodRe = /@(Get|Post|Put|Patch|Delete|Options|Head|All)\(([^)]*)\)[\s\S]*?(?:public|private|protected)?\s*([a-zA-Z0-9_]+)\s*\(/g;
    let mm;
    while ((mm = methodRe.exec(code))) {
      const method = mm[1].toUpperCase();
      const methodPath = (mm[2] || '').replace(/^['"]|['"]$/g, '');
      const methodName = mm[3];
      methods.push({ controller: className, file: filePath, basePath, method, path: methodPath, methodName, summary: '', params: [], responses: [] });
    }
    classes.push({ name: className, decorators: [{ name: 'Controller', args: [basePath] }], methods });
  }

  return { imports, functions, classes, controllers: classes.filter((c) => true).map((c) => ({ className: c.name, file: filePath, basePath: (c.decorators?.[0]?.args?.[0] || ''), methods: c.methods })) };
}

function buildTree(paths) {
  const root = { name: 'root', type: 'directory', children: {} };
  for (const p of paths) {
    const parts = p.split(path.sep);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (!node.children[part]) {
        node.children[part] = isLast
          ? { name: part, type: 'file', path: p }
          : { name: part, type: 'directory', children: {} };
      }
      node = node.children[part];
    }
  }
  return root;
}

function flattenTree(node) {
  const res = [];
  function visit(n, currentPath = '') {
    if (n.type === 'file') {
      res.push(currentPath);
    } else if (n.type === 'directory') {
      const nextPath = currentPath ? path.join(currentPath, n.name) : '';
      for (const childName of Object.keys(n.children)) {
        const child = n.children[childName];
        visit(child, nextPath ? path.join(nextPath, child.name) : child.name);
      }
    }
  }
  visit(node, '');
  return res;
}

function main() {
  // CLI args
  const args = process.argv.slice(2);
  const argMap = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      argMap[key] = val;
    }
  }
  const rootDir = path.resolve(process.cwd(), argMap.root || DEFAULT_ROOT);
  const outDir = path.resolve(process.cwd(), argMap.out || DEFAULT_OUT);

  ensureDirSync(outDir);

  const files = walk(rootDir, []);

  const codebase = {
    generatedAt: new Date().toISOString(),
    rootDir,
    outDir,
    files: {},
    relations: [],
    controllers: [],
    endpoints: [],
    dtos: {},
    appwrite: {
      ops: [],
      inferredCollections: {}, // key: collExpr -> { keys: Set<string>, files: Set<string> }
    },
  };

  // Pre-collect DTOs per file
  const fileDTOs = {};

for (const filePath of files) {
    const code = safeRead(filePath);
    let sourceFile = null;
    if (ts) {
      try {
        sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
      } catch {}
    }

    let imports = [];
    let functions = [];
    let classes = [];
    let controllers = [];
    let dtos = {};
    let appwriteOps = [];

    if (ts && sourceFile) {
      imports = gatherImportsTS(sourceFile, filePath);
      const fc = extractFunctionsAndClassesTS(sourceFile);
      functions = fc.functions;
      classes = fc.classes;
      controllers = extractControllersAndEndpointsTS(sourceFile, filePath);
      dtos = extractDTOsTS(sourceFile);
      appwriteOps = extractAppwriteOpsTS(sourceFile, filePath);
      // If we failed to find controllers via TS (decorator metadata changes across TS versions), use regex fallback
      if (!controllers.length) {
        const fallback = extractWithRegex(code, filePath);
        controllers = fallback.controllers;
        // Merge functions/classes only if TS did not pick any (keep TS result prefered)
        if (!functions.length) functions = fallback.functions;
        if (!classes.length) classes = fallback.classes;
        if (!imports.length) imports = fallback.imports;
      }
    } else {
      const fallback = extractWithRegex(code, filePath);
      imports = fallback.imports;
      functions = fallback.functions;
      classes = fallback.classes;
      controllers = fallback.controllers;
      dtos = {}; // regex fallback skips DTO extraction
      appwriteOps = [];
    }

    fileDTOs[filePath] = dtos;

    codebase.files[filePath] = {
      functions,
      classes,
      imports: imports.map((spec) => ({ specifier: spec, resolved: isRelativeImport(spec) ? path.normalize(path.resolve(path.dirname(filePath), spec)) : null })),
      exports: [],
      isController: controllers.length > 0,
      appwriteOps,
    };

    if (controllers.length) codebase.controllers.push(...controllers);
    if (appwriteOps.length) {
      codebase.appwrite.ops.push(...appwriteOps);
      for (const op of appwriteOps) {
        const key = op.collExpr || 'UNKNOWN_COLLECTION_EXPR';
        if (!codebase.appwrite.inferredCollections[key]) {
          codebase.appwrite.inferredCollections[key] = { keys: new Set(), files: new Set() };
        }
        const bucket = codebase.appwrite.inferredCollections[key];
        for (const k of op.dataKeys || []) bucket.keys.add(k);
        bucket.files.add(filePath);
      }
    }

    // Relations: imports
    for (const imp of imports) {
      if (isRelativeImport(imp)) {
        const resolved = path.normalize(path.resolve(path.dirname(filePath), imp));
        codebase.relations.push({ from: filePath, to: resolved });
      } else {
        codebase.relations.push({ from: filePath, to: imp });
      }
    }
  }

  // Merge DTOs to global registry
  for (const [filePath, dtoMap] of Object.entries(fileDTOs)) {
    for (const [dtoName, dto] of Object.entries(dtoMap)) {
      codebase.dtos[dtoName] = { ...dto, file: filePath };
    }
  }

  // Build endpoints list with DTO body inference
  function joinUrl(a, b) {
    const segs = [a, b].filter(Boolean).map((s) => String(s).replace(/^\/+|\/+$/g, ''));
    return ('/' + segs.join('/')).replace(/\\/g, '/').replace(/\/+/, '/').replace(/\/+$/,'');
  }

  for (const c of codebase.controllers) {
    for (const m of c.methods) {
      const bodyParam = (m.params || []).find((p) => p.in === 'Body');
      const bodyType = bodyParam?.type || null;
      let bodyDTO = null;
      if (bodyType && /Dto\b/i.test(bodyType)) {
        // try exact match
        const matchName = bodyType.replace(/[^a-zA-Z0-9_]/g, '');
        bodyDTO = codebase.dtos[matchName] || null;
      }
      codebase.endpoints.push({
        controller: c.className,
        file: c.file,
        method: m.method,
        basePath: c.basePath,
        path: m.path,
        fullPath: joinUrl(c.basePath, m.path),
        methodName: m.methodName,
        summary: m.summary,
        params: m.params,
        bodyType,
        bodyDTO,
        responses: m.responses,
      });
    }
  }

  // Write codebase-map.json
  const mapPath = path.join(outDir, 'codebase-map.json');
  // Serialize Sets for inferredCollections
  const serialized = JSON.parse(JSON.stringify(codebase, (key, value) => {
    if (value instanceof Set) return Array.from(value);
    return value;
  }));
  // Convert nested sets inside inferredCollections
  if (serialized.appwrite && serialized.appwrite.inferredCollections) {
    const fixed = {};
    for (const [expr, val] of Object.entries(serialized.appwrite.inferredCollections)) {
      fixed[expr] = {
        keys: Array.from(codebase.appwrite.inferredCollections[expr].keys),
        files: Array.from(codebase.appwrite.inferredCollections[expr].files),
      };
    }
    serialized.appwrite.inferredCollections = fixed;
  }
  fs.writeFileSync(mapPath, JSON.stringify(serialized, null, 2), 'utf8');

  // Write endpoints.json
  const endpointsPath = path.join(outDir, 'endpoints.json');
  fs.writeFileSync(endpointsPath, JSON.stringify(codebase.endpoints, null, 2), 'utf8');

  // Write inferred attributes for Appwrite
  const inferredPath = path.join(outDir, 'appwrite-inferred-attributes.json');
  const inferred = {};
  for (const [expr, v] of Object.entries(codebase.appwrite.inferredCollections)) {
    inferred[expr] = {
      keys: Array.from(v.keys),
      files: Array.from(v.files),
    };
  }
  fs.writeFileSync(inferredPath, JSON.stringify(inferred, null, 2), 'utf8');

  // Write frontend-api-guide.md
  const guidePath = path.join(outDir, 'frontend-api-guide.md');
  const md = [];
  md.push('# Frontend API Guide (Generated)');
  md.push('');
  md.push(`Generated at: ${codebase.generatedAt}`);
  md.push('');
  const controllersByName = {};
  for (const c of codebase.controllers) {
    controllersByName[c.className] = c;
  }
  const endpointsByController = {};
  for (const ep of codebase.endpoints) {
    if (!endpointsByController[ep.controller]) endpointsByController[ep.controller] = [];
    endpointsByController[ep.controller].push(ep);
  }
  for (const [controllerName, eps] of Object.entries(endpointsByController)) {
    const ctrl = controllersByName[controllerName];
    md.push(`## ${controllerName} (${ctrl?.basePath ? '/' + ctrl.basePath : ''})`);
    md.push('');
    for (const ep of eps.sort((a,b)=>a.fullPath.localeCompare(b.fullPath))) {
      md.push(`### ${ep.method} ${ep.fullPath}`);
      if (ep.summary) {
        md.push('Summary:');
        md.push('');
        md.push('```');
        md.push(ep.summary);
        md.push('```');
      }
      // Params
      const pathParams = ep.params.filter((p) => p.in === 'Param');
      const queryParams = ep.params.filter((p) => p.in === 'Query');
      if (pathParams.length) {
        md.push('Path params:');
        md.push('');
        for (const p of pathParams) {
          md.push(`- ${p.arg || p.name}: ${p.type}`);
        }
        md.push('');
      }
      if (queryParams.length) {
        md.push('Query params:');
        md.push('');
        for (const p of queryParams) {
          md.push(`- ${p.arg || p.name}: ${p.type}`);
        }
        md.push('');
      }
      if (ep.bodyType) {
        md.push('Request body:');
        md.push('');
        md.push('```json');
        if (ep.bodyDTO?.props?.length) {
          const shape = {};
          for (const prop of ep.bodyDTO.props) {
            shape[prop.name] = prop.type || 'any';
          }
          md.push(JSON.stringify(shape, null, 2));
        } else {
          md.push(`{
  "type": "${ep.bodyType}"
}`);
        }
        md.push('```');
      }
      if (ep.responses?.length) {
        md.push('Responses (as declared via Swagger decorators, if present):');
        md.push('');
        for (const r of ep.responses) {
          md.push('- ' + '`' + r + '`');
        }
      }
      md.push('');
    }
  }
  fs.writeFileSync(guidePath, md.join('\n'), 'utf8');

  // Write llm_context.md
  const llmPath = path.join(outDir, 'llm_context.md');
  const llm = [];
  llm.push('# LLM Codebase Context (Generated)');
  llm.push('');
  llm.push(`Root: ${rootDir}`);
  llm.push(`Generated at: ${codebase.generatedAt}`);
  llm.push('');
  llm.push('Artifacts:');
  llm.push(`- codebase-map.json`);
  llm.push(`- endpoints.json`);
  llm.push(`- appwrite-inferred-attributes.json`);
  llm.push(`- frontend-api-guide.md`);
  llm.push('');
  llm.push('## Quick Stats');
  llm.push(`- Total files scanned: ${files.length}`);
  llm.push(`- Controllers found: ${codebase.controllers.length}`);
  llm.push(`- Endpoints found: ${codebase.endpoints.length}`);
  llm.push('');
  llm.push('## Controllers and Endpoints');
  for (const [controllerName, eps] of Object.entries(endpointsByController)) {
    const ctrl = controllersByName[controllerName];
    llm.push(`### ${controllerName} (${ctrl?.basePath ? '/' + ctrl.basePath : ''})`);
    for (const ep of eps) {
      llm.push(`- ${ep.method} ${ep.fullPath} -> ${path.relative(process.cwd(), ep.file)}`);
    }
    llm.push('');
  }
  fs.writeFileSync(llmPath, llm.join('\n'), 'utf8');

  console.log('Analysis complete. Outputs:');
  console.log(' -', mapPath);
  console.log(' -', endpointsPath);
  console.log(' -', guidePath);
  console.log(' -', llmPath);
}

main();

