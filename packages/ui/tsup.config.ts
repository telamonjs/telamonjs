import { readdirSync, statSync } from 'node:fs'
import { basename, dirname, resolve as resolvePath } from 'node:path'
import type { Plugin } from 'esbuild'
import { defineConfig } from 'tsup'

/**
 * Build setup:
 * - JS: tsup/esbuild, file-per-file (every src module is an entry point).
 *   `bundle: true` + the resolver plugin below externalize ALL imports and
 *   rewrite relative ones with proper ESM extensions
 *   ('./foo' -> './foo.js', './dir' -> './dir/index.js').
 *   This preserves the exact dist/ module graph (deep imports keep working).
 * - Types: `tsc --emitDeclarationOnly` (see package.json build script) --
 *   tsup dts is too slow/fragile for 400+ unbundled entries.
 * - CSS: copied via package.json build script (cp src/index.css dist/).
 *
 * Why a custom plugin instead of esbuild-plugin-file-path-extensions:
 * 1. That plugin only handles `kind === 'import-statement'`, so dynamic
 *    `import()` (React.lazy boundaries) got INLINED with broken inner paths.
 * 2. Its directory check is case-INsensitive on macOS, so `./DataTable`
 *    (file DataTable.tsx) collided with the `./datatable/` directory and was
 *    rewritten to the non-existent './DataTable/index.js'.
 * The plugin below mirrors the old fix-imports.mjs semantics: prefer file
 * over directory, case-sensitive existence checks, handle static + dynamic
 * imports and `export ... from`.
 */

/** Case-sensitive existence check (macOS FS is case-insensitive). */
function existsExact(absPath: string): boolean {
  try {
    return readdirSync(dirname(absPath)).includes(basename(absPath))
  } catch {
    return false
  }
}

function isDirectory(absPath: string): boolean {
  try {
    return statSync(absPath).isDirectory()
  } catch {
    return false
  }
}

const JS_LIKE_EXT = /\.(?:ts|tsx|cts|mts|js|jsx|cjs|mjs)$/
const NON_JS_EXT = /\.(?:css|scss|json|svg|png|jpe?g|gif|webp|woff2?)$/

const relativeImportExtensions: Plugin = {
  name: 'relative-import-extensions',
  setup(build) {
    // Relative specifiers only; bare imports are handled by tsup `external`.
    build.onResolve({ filter: /^\.\.?\// }, args => {
      // require-call: src has two lazy `require('./x')` calls (VirtualDataTable,
      // debug-logger) that tsc used to emit verbatim. Externalizing keeps them
      // lazy (esbuild emits a __require shim) instead of inlining the target.
      if (
        args.kind !== 'import-statement' &&
        args.kind !== 'dynamic-import' &&
        args.kind !== 'require-call'
      ) {
        return undefined
      }

      const spec = args.path
      // Assets (e.g. CSS) pass through untouched, like tsc did.
      if (NON_JS_EXT.test(spec)) {
        return { path: spec, external: true }
      }

      const abs = resolvePath(args.resolveDir, spec)
      // './dir/' -> './dir' so we never emit './dir//index.js'
      const cleanSpec = spec.replace(/\/+$/, '')

      // Already extensioned source specifier: normalize to .js
      if (JS_LIKE_EXT.test(spec)) {
        return { path: spec.replace(JS_LIKE_EXT, '.js'), external: true }
      }

      // 1. Prefer a FILE (./foo -> ./foo.js) -- matches fix-imports.mjs
      if (existsExact(`${abs}.tsx`) || existsExact(`${abs}.ts`)) {
        return { path: `${cleanSpec}.js`, external: true }
      }

      // 2. Directory with an index module (./dir -> ./dir/index.js)
      if (
        existsExact(abs) &&
        isDirectory(abs) &&
        (existsExact(resolvePath(abs, 'index.tsx')) ||
          existsExact(resolvePath(abs, 'index.ts')))
      ) {
        return { path: `${cleanSpec}/index.js`, external: true }
      }

      // 3. Fallback: blind append, identical to the old fix-imports.mjs
      return { path: `${cleanSpec}.js`, external: true }
    })
  },
}

export default defineConfig({
  entry: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/test/**',
    // Storybook stories and test helpers are dev-only: keep them out of dist/.
    '!src/**/*.stories.tsx',
    '!src/**/test-helpers.ts',
  ],
  format: ['esm'],
  target: 'es2022',
  outDir: 'dist',
  // bundle must stay true so the resolver plugin runs; nothing is actually
  // inlined because every import is marked external.
  bundle: true,
  splitting: false,
  sourcemap: false,
  // clean must stay false: the old tsc build was also non-cleaning, and tsc's
  // incremental declaration emit (dist/.tsbuildinfo) would skip re-emitting
  // .d.ts files that a tsup clean had just deleted. Use `rm -rf dist` for a
  // truly clean build.
  clean: false,
  dts: false, // declarations come from tsc --emitDeclarationOnly
  minify: false,
  treeshake: false,
  // Externalize every bare specifier (deps, peerDeps AND devDeps like
  // @storybook/* used by *.stories.tsx) -- nothing from node_modules may be
  // inlined; output must stay a 1:1 transpile of src/.
  external: [/^[^./]/],
  esbuildPlugins: [relativeImportExtensions],
})
