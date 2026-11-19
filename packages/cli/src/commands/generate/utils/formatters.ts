/**
 * String formatting utilities for code generation
 */

/**
 * Capitalize first letter of a string
 * @example capitalize('cliente') => 'Cliente'
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert string to camelCase
 * @example camelCase('processo-seletivo') => 'processoSeletivo'
 */
export function camelCase(str: string): string {
  return str
    .split(/[-_\s]/)
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : capitalize(word.toLowerCase())
    )
    .join('')
}

/**
 * Convert string to PascalCase
 * @example pascalCase('processo-seletivo') => 'ProcessoSeletivo'
 */
export function pascalCase(str: string): string {
  return str
    .split(/[-_\s]/)
    .map(word => capitalize(word.toLowerCase()))
    .join('')
}

/**
 * Pluralize a word (simple Portuguese rules)
 * @example pluralize('cliente') => 'clientes'
 */
export function pluralize(word: string): string {
  // Portuguese pluralization rules (basic)
  if (word.endsWith('s')) return word
  if (word.endsWith('m')) return word.slice(0, -1) + 'ns'
  if (word.endsWith('r') || word.endsWith('z')) return word + 'es'
  if (
    word.endsWith('al') ||
    word.endsWith('el') ||
    word.endsWith('ol') ||
    word.endsWith('ul')
  ) {
    return word.slice(0, -1) + 'is'
  }
  if (word.endsWith('il')) {
    return word.slice(0, -2) + 'eis'
  }
  return word + 's'
}

/**
 * Singularize a word (simple Portuguese rules)
 * @example singular('clientes') => 'cliente'
 */
export function singular(word: string): string {
  // Portuguese singularization rules (basic)
  if (word.endsWith('ns')) return word.slice(0, -2) + 'm'
  if (word.endsWith('res') || word.endsWith('zes')) return word.slice(0, -2)
  if (
    word.endsWith('ais') ||
    word.endsWith('eis') ||
    word.endsWith('ois') ||
    word.endsWith('uis')
  ) {
    return word.slice(0, -2) + 'l'
  }
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

/**
 * Lowercase only the first character (matches Prisma Client's model accessor
 * naming, e.g. model `ClienteFinal` -> `prisma.clienteFinal`).
 * @example lowerFirst('ClienteFinal') => 'clienteFinal'
 */
export function lowerFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

/**
 * Convert string to kebab-case
 * @example kebabCase('ProcessoSeletivo') => 'processo-seletivo'
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}
