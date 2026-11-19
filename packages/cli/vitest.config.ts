import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The compile guard shells out to `tsc --noEmit` against the full
    // telamonjs-ui type graph -- slower than a unit test.
    testTimeout: 60000,
  },
})
