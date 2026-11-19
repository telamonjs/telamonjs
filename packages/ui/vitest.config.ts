import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.storybook'],
    testTimeout: 10000, // Increase from default 5000ms for dialog/async tests
    maxConcurrency: 4, // Limit concurrent test workers to prevent high CPU load
    poolOptions: {
      threads: {
        maxThreads: 4, // Max 4 parallel test files
        minThreads: 1,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/**/index.ts',
        'src/types/**',
        'src/**/*.d.ts',
      ],
      all: true,
      // Enforced global coverage floor: 50% (the automated gate for the whole
      // package). New components are expected to ship with full tests, but that
      // 100%-on-new-code goal is enforced in code review, not by this threshold.
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'lucide-react': path.resolve(
        __dirname,
        './src/test/__mocks__/lucide-react.tsx'
      ),
      'next/image': path.resolve(
        __dirname,
        './src/test/__mocks__/next/image.tsx'
      ),
      '@/ui/dropdown-menu': path.resolve(
        __dirname,
        './src/test/__mocks__/ui/dropdown-menu.tsx'
      ),
      '../ui/dropdown-menu': path.resolve(
        __dirname,
        './src/test/__mocks__/ui/dropdown-menu.tsx'
      ),
      // Same literal-specifier stand-in as above, one level deeper -- covers
      // importers under src/layouts/modern-sidebar/ (see footer.tsx), which
      // resolve dropdown-menu via '../../ui/dropdown-menu'. Mirrors the
      // existing pattern so default (non-overridden) test behavior is
      // unchanged after the ModernSidebar decomposition.
      '../../ui/dropdown-menu': path.resolve(
        __dirname,
        './src/test/__mocks__/ui/dropdown-menu.tsx'
      ),
    },
  },
})
