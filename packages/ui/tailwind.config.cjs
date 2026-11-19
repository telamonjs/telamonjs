/**
 * Tailwind config for telamonjs-ui internal development (Storybook, tests)
 * Uses the same preset that consumers will use
 * @type {import('tailwindcss').Config}
 */
// tailwind-preset.js e ESM ("export default"; package.json "type": "module").
// require() aqui (Node CJS-requires-ESM interop) devolve { default: {...} },
// nao o preset direto -- sem o unwrap, presets[] recebe um objeto sem
// theme/content e o Tailwind ignora silenciosamente (ex.: `border-border`
// nao existe no build do Storybook).
const presetModule = require('./tailwind-preset.js')

module.exports = {
  presets: [presetModule.default ?? presetModule],
  content: ['./src/**/*.{ts,tsx,js,jsx}', './.storybook/**/*.{ts,tsx,js,jsx}'],
}
