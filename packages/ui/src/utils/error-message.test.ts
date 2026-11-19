import { describe, it, expect } from 'vitest'
import { getErrorMessage } from './error-message'

describe('getErrorMessage', () => {
  it('Error with string message', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
  })
  it('Error whose message is the NestJS array (client assigned it as-is)', () => {
    const err = new Error('x') as Error & { message: unknown }
    err.message = ['property id should not exist', 'nome must be a string']
    expect(getErrorMessage(err)).toBe('property id should not exist\nnome must be a string')
  })
  it('NestJS body and axios-like response', () => {
    expect(getErrorMessage({ statusCode: 400, message: ['a', 'b'], error: 'Bad Request' })).toBe('a\nb')
    expect(getErrorMessage({ response: { data: { message: 'conflict' } } })).toBe('conflict')
  })
  it('field errors and result objects', () => {
    expect(getErrorMessage({ success: false, errors: { nome: ['obrigatório'] } })).toBe('obrigatório')
    expect(getErrorMessage({ success: false })).toBeUndefined()
    expect(getErrorMessage(undefined)).toBeUndefined()
  })
})
