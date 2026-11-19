import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'], // Co-localized tests
    exclude: ['node_modules', 'dist', '__tests__/**'], // Exclude old tests dir
    testTimeout: 30000, // 30s for integration tests with Redis
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        '__tests__/', // Old test directory
        'src/**/*.test.ts', // Test files
        'src/**/*.spec.ts',
        'src/test/**', // Test infrastructure
        'dist/',
        'examples/',
        'docker/',
        '*.config.*',
        'src/**/index.ts', // Barrel exports
        'src/**/types.ts', // Type definitions
      ],
      all: true,
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
