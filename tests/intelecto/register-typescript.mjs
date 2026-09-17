// Usa o TypeScript já instalado; não exige um runner adicional (Node >= 22.15).
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const candidate = specifier.startsWith('@/')
        ? new URL(`src/${specifier.slice(2)}`, root)
        : new URL(specifier, context.parentURL);
      for (const suffix of ['', '.ts', '/index.ts']) {
        const path = fileURLToPath(candidate) + suffix;
        if (path.endsWith('.ts') && existsSync(path)) {
          return { url: pathToFileURL(path).href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts') && !url.includes('/node_modules/')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
          fileName: fileURLToPath(url),
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});
