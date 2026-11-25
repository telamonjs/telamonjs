import { parseParameterValue } from './parameter-value'

describe('parseParameterValue', () => {
  it('reads each type', () => {
    expect(parseParameterValue('STRING', '42')).toBe('42')
    expect(parseParameterValue('NUMBER', '4.5')).toBe(4.5)
    expect(parseParameterValue('BOOLEAN', 'false')).toBe(false)
    expect(parseParameterValue('JSON', '{"a":[1]}')).toEqual({ a: [1] })
  })

  it('throws on a value that does not parse', () => {
    expect(() => parseParameterValue('NUMBER', '')).toThrow()
    expect(() => parseParameterValue('NUMBER', 'abc')).toThrow()
    expect(() => parseParameterValue('BOOLEAN', 'yes')).toThrow()
    expect(() => parseParameterValue('JSON', '{')).toThrow()
  })
})
