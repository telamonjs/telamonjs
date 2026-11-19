import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  core: {
    disableTelemetry: true,
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: prop =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
  viteFinal: async config => {
    const path = await import('path')

    // Ensure we can import from src
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
    }

    // Next polyfills `process.env` in the browser; Vite only replaces
    // NODE_ENV, so other reads (logger's LOG_LEVEL, debug flags) threw
    // "process is not defined". Unset keys read as undefined, as in Next.
    config.define = { ...config.define, 'process.env': {} }

    // PostCSS/Tailwind: deixa o Vite auto-detectar ../postcss.config.cjs
    // (require('tailwindcss') + require('autoprefixer')). NAO reescrever
    // aqui com nomes de plugin em string -- postcss() core espera
    // instancias/funcoes de plugin, nao strings (so postcss-load-config,
    // usado na leitura do .cjs, entende string). Passar string faz o
    // postcss.normalize() cair no else e lancar "X is not a PostCSS plugin".

    return config
  },
}

export default config
