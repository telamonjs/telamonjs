import { describe, it, expect } from 'vitest'
import { camelCase, capitalize, kebabCase, lowerFirst, pascalCase, pluralize, singular } from './formatters.js'

describe('formatters', () => {
  it('capitalize / lowerFirst touch only the first character', () => {
    expect(capitalize('cliente')).toBe('Cliente')
    expect(capitalize('')).toBe('')
    expect(lowerFirst('ClienteFinal')).toBe('clienteFinal')
  })

  it('camelCase / pascalCase split on hyphens, underscores and spaces', () => {
    expect(camelCase('processo-seletivo')).toBe('processoSeletivo')
    expect(camelCase('ordem_de servico')).toBe('ordemDeServico')
    expect(pascalCase('processo-seletivo')).toBe('ProcessoSeletivo')
  })

  it('kebabCase splits camel humps and separators', () => {
    expect(kebabCase('ProcessoSeletivo')).toBe('processo-seletivo')
    expect(kebabCase('ordem_de servico')).toBe('ordem-de-servico')
  })

  it.each([
    ['cliente', 'clientes'],
    ['item', 'itens'],
    ['fornecedor', 'fornecedores'],
    ['animal', 'animais'],
    ['papel', 'papeis'],
    ['funil', 'funeis'],
    ['status', 'status'],
  ])('pluralize(%s) = %s', (word, plural) => {
    expect(pluralize(word)).toBe(plural)
  })

  it.each([
    ['clientes', 'cliente'],
    ['itens', 'item'],
    ['fornecedores', 'fornecedor'],
    ['animais', 'animal'],
    ['papeis', 'papel'],
    ['usuario', 'usuario'],
  ])('singular(%s) = %s', (word, single) => {
    expect(singular(word)).toBe(single)
  })
})
