// eslint-config-next 16 ja' e' flat config nativo — FlatCompat quebra
// ("Converting circular structure to JSON")
import coreWebVitals from 'eslint-config-next/core-web-vitals'
// Os mesmos arquivos tambem passam pelo `pnpm lint` da raiz (eslint.config.js),
// que carrega este plugin — os eslint-disable dele precisam resolver aqui tambem.
import telamonjsAccessibility from '../../packages/ui/eslint-plugin-accessibility.js'

const config = [
  ...coreWebVitals,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'telamonjs-accessibility': telamonjsAccessibility },
    rules: {
      'telamonjs-accessibility/button-accessibility': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn', // idem raiz
    },
  },
  { ignores: ['.next/**', '.source/**'] },
]

export default config
