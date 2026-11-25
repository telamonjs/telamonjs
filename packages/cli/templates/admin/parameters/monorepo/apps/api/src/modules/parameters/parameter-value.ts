export const PARAMETER_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'] as const
export type ParameterType = (typeof PARAMETER_TYPES)[number]

/** A parameter's text `value` read as its `type`. Throws when it does not parse. */
export function parseParameterValue(type: string, value: string): unknown {
  switch (type) {
    case 'NUMBER': {
      const number = Number(value)
      if (value.trim() === '' || !Number.isFinite(number)) throw new Error(`Not a number: "${value}"`)
      return number
    }
    case 'BOOLEAN':
      if (value !== 'true' && value !== 'false') throw new Error(`Not a boolean: "${value}" (true or false)`)
      return value === 'true'
    case 'JSON':
      return JSON.parse(value)
    default:
      return value
  }
}
