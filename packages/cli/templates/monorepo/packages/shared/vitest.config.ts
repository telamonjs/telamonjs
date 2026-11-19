import { defineConfig } from 'vitest/config'

// ponytail: the scaffolded shared package only ships the Prisma singleton
// (nothing to unit-test yet) — passWithNoTests keeps `pnpm test` green until
// real shared logic (with its own spec) lands here.
export default defineConfig({
  test: { passWithNoTests: true },
})
