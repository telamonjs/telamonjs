/**
 * Characterization test for the public barrel (`src/index.ts`).
 *
 * WHY THIS EXISTS: plan 012 (decompose god modules) wants to split `index.ts`
 * into per-area intermediate barrels re-exported from the root, WITHOUT
 * changing the public export surface. This test pins the exact set of names
 * the package currently exports so that refactor can run `pnpm test index`
 * before/after each extraction and see zero diff. It intentionally does NOT
 * assert *how many* names are exported (that count is volatile and rots) —
 * the snapshot file carries the actual list; this source file only asserts
 * shape and a curated subset of names that must never silently disappear.
 *
 * Do NOT "fix" this test by updating the snapshot to match an intentional
 * export removal without going through a breaking-change review + version bump
 * process described in CLAUDE.md — a snapshot diff here is a public API
 * change, not a test bug.
 */
import { describe, it, expect } from 'vitest'
import * as lib from './index'

describe('index.ts (public barrel)', () => {
  describe('Export surface', () => {
    it('exports only named bindings (no default export)', () => {
      expect((lib as Record<string, unknown>).default).toBeUndefined()
    })

    it('pins the full sorted list of exported names', () => {
      const names = Object.keys(lib).sort()
      expect(names).toMatchSnapshot()
    })

    it('has no undefined-valued re-exports', () => {
      // `DialogClose` used to resolve to `undefined` HERE (and only here):
      // the global `../ui/dialog` mock in src/test/ui-mocks.tsx didn't
      // define it — the real barrel always exported it fine. The mock was
      // completed; if this list ever grows, either a real re-export broke
      // or a global mock in ui-mocks.tsx is missing a name the barrel
      // re-exports.
      const undefinedExports = Object.entries(lib)
        .filter(([, value]) => value === undefined)
        .map(([name]) => name)
      expect(undefinedExports).toEqual([])
    })
  })

  describe('Critical exports present (documentation-as-test)', () => {
    // A curated subset from apps/docs/content/docs/reference.mdx's Component Registry.
    // This is NOT the full surface (see the snapshot above for that) — it
    // exists so a regression in one of these gives a readable failure
    // instead of just "snapshot mismatch".
    it.each([
      'AppProviders',
      'QueryClientProvider',
      'AdminShell',
      'ModernSidebar',
      'AppShell',
      'Form',
      'AdminForm',
      'CreateForm',
      'EditForm',
      'ZustandForm',
      'CreatePage',
      'EditPage',
      'BaseFormPage',
      'ListPage',
      'DataTable',
      'DetailLayout',
      'DetailCard',
      'getIcon',
    ])('exports %s', name => {
      expect(lib).toHaveProperty(name)
    })

    it('Form and AdminForm are the same component (documented alias)', () => {
      expect(lib.Form).toBe(lib.AdminForm)
    })
  })

  describe('Edge cases', () => {
    it('does not throw on import (no eager side effects that touch window/document at module scope)', async () => {
      // Re-importing (module cache hit) must stay side-effect free.
      await expect(import('./index')).resolves.toBeDefined()
    })
  })
})
