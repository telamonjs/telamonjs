import { describe, expect, it } from 'vitest'
import { isMessageRef, msg } from './msg'

describe('msg', () => {
  it('creates a MessageRef with key and values', () => {
    expect(msg('users.title')).toEqual({ key: 'users.title' })
    expect(msg('users.count', { count: 2 })).toEqual({ key: 'users.count', values: { count: 2 } })
  })

  it('isMessageRef distinguishes refs from strings and arbitrary objects', () => {
    expect(isMessageRef(msg('a'))).toBe(true)
    expect(isMessageRef('a')).toBe(false)
    expect(isMessageRef({ key: 'a' })).toBe(false)
    expect(isMessageRef(null)).toBe(false)
  })
})

// PRD 068 item 14: the Symbol brand does not survive the server → client
// props boundary (serialization keeps only enumerable keys). `{ key, $msg: true }`
// is the serializable spelling of the same ref.
describe('serializable MessageRef ({ key, $msg: true })', () => {
  const roundTrip = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

  it('msg() loses its brand across serialization (known limitation of the Symbol)', () => {
    expect(isMessageRef(roundTrip(msg('menu.alunos')))).toBe(false)
  })

  it('{ key, $msg: true } is a ref, before and after serialization', () => {
    const ref = { key: 'menu.alunos', values: { n: 2 }, $msg: true } as const
    expect(isMessageRef(ref)).toBe(true)
    expect(isMessageRef(roundTrip(ref))).toBe(true)
  })

  it('$msg needs a string key and the literal true', () => {
    expect(isMessageRef({ $msg: true })).toBe(false)
    expect(isMessageRef({ key: 'a', $msg: 'yes' })).toBe(false)
    expect(isMessageRef({ key: 1, $msg: true })).toBe(false)
  })
})
