// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'
import telamonjsAccessibility from './packages/ui/eslint-plugin-accessibility.js'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/pnpm-lock.yaml',
      '**/tailwind.config.*',
      '**/postcss.config.*',
      '**/next.config.*',
      'packages/ui/example/**',
      'packages/*/dist/**',
      'packages/cli/dist/**',
      'packages/cli/src/commands/lint/__fixtures__/**', // verbatim copies of consumer modules (lint fixtures)
      '**/storybook-static/**',
      'packages/queue/examples/**',
      '**/*.cjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'telamonjs-accessibility': telamonjsAccessibility,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off', // Allow console for CLI tools
      'prefer-const': 'error',
      'no-unused-vars': 'off', // Turn off base rule
      'no-undef': 'off', // TypeScript handles this
      // Forbids raw Tailwind palette colors in className — they work in light
      // mode and break in dark mode. Use semantic tokens. Colored accents
      // (bg-blue-50 etc.) are allowed as long as they carry a `dark:` variant.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/\\b(bg-white|bg-(gray|slate)-(50|100|200|300|400|500)|text-(gray|slate)-[5-9]00|border(-[trblxy])?-(gray|slate)-(100|200|300)|from-gray-50|to-white)\\b/]',
          message:
            'Use semantic tokens (bg-card/bg-background, bg-muted, text-foreground/text-muted-foreground, border-border) instead of raw palette colors — they break in dark mode. Legitimate exception (print/QR white, translucent overlay): // eslint-disable-next-line no-restricted-syntax with a justification.',
        },
        {
          selector:
            'TemplateElement[value.raw=/\\b(bg-white|bg-(gray|slate)-(50|100|200|300|400|500)|text-(gray|slate)-[5-9]00|border(-[trblxy])?-(gray|slate)-(100|200|300)|from-gray-50|to-white)\\b/]',
          message:
            'Use semantic tokens (bg-card/bg-background, bg-muted, text-foreground/text-muted-foreground, border-border) instead of raw palette colors — they break in dark mode.',
        },
      ],
      // telamonjs accessibility rules (warning level for gradual adoption)
      'telamonjs-accessibility/button-accessibility': 'warn',
      'telamonjs-accessibility/input-accessibility': 'warn',
      'telamonjs-accessibility/field-testid': 'off', // Optional for now
    },
  },
  {
    files: ['**/*.{js,mjs,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        // Globals web expostos pelo Node ≥18 (scripts/*.mjs usam)
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
      },
    },
  },
  {
    // Next.js App Router requires these exports alongside the default
    // component export (page.tsx: generateMetadata/generateStaticParams;
    // layout.tsx: metadata) — framework contract, not a refactor hazard.
    files: ['apps/**/app/**/{page,layout}.tsx', 'packages/cli/templates/**/app/**/{page,layout}.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['metadata', 'generateMetadata', 'generateStaticParams'],
        },
      ],
    },
  },
  {
    // Entire test infrastructure (mocks/utils in src/test included): any and
    // unused are fixture conventions, not public surface.
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'packages/ui/src/test/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // A11y rules apply to COMPONENTS (linted at the source); test/story JSX
    // is fixture — requiring data-testid/aria-label there is noise.
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/*.stories.{ts,tsx}',
    ],
    rules: {
      'telamonjs-accessibility/button-accessibility': 'off',
      'telamonjs-accessibility/input-accessibility': 'off',
    },
  },
  {
    // Legitimate exceptions to the raw-color no-restricted-syntax rule:
    // - PrintLayout/QRCode: white is by design (paper / code readability).
    // - StatusIndicator: deliberate "gray" scale (already dark-aware).
    // - queue/**: the queue dashboard has its own status color scheme.
    files: [
      '**/PrintLayout.tsx',
      '**/QRCodeGenerator.tsx',
      '**/StatusIndicator.tsx',
      '**/color-presets.*', // color scale definitions (source of the presets)
      '**/cards/colors.ts', // card color scales, every entry already dark-aware
      '**/queue/**',
      '**/*.test.{ts,tsx}',
      '**/*.stories.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // ui source must route logs through the logger (src/utils/logger.ts).
    // console.error/warn allowed (observability); console.log/debug/info are
    // not — they leak into consumers' consoles. Exceptions: debug-logger
    // (opt-in debugger gated by flag), tests and stories.
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    ignores: [
      'packages/ui/src/utils/debug/**',
      '**/*.test.{ts,tsx}',
      '**/*.stories.{ts,tsx}',
      'packages/ui/src/test/**',
    ],
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  }, // Disables ESLint rules that conflict with Prettier
  prettierConfig,
  ...storybook.configs['flat/recommended'],
  {
    // storybook/no-renderer-packages flags `import type { Meta, StoryObj }
    // from '@storybook/react'` in every story, suggesting '@storybook/react-vite'
    // instead. But @storybook/react-vite@8.6.14 does not re-export those types
    // (its dist/index.d.ts only exports FrameworkOptions/StorybookConfig) --
    // switching the import breaks type-check. Known upstream gap in Storybook
    // 8.x + Vite framework packages (types-from-react-vite only landed in v9).
    // Narrow rule-off instead of upgrading storybook's major (out of scope here).
    files: ['**/*.stories.{ts,tsx}'],
    rules: {
      'storybook/no-renderer-packages': 'off',
    },
  },
]
