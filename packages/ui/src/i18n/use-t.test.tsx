import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { msg } from './msg'
import { useTelamonjsT, useText } from './use-t'

describe('useText', () => {
  it('passes literals through and resolves refs against the message tree', () => {
    const { result } = renderHook(() => useText())
    expect(result.current('Usuários')).toBe('Usuários')
    expect(result.current(undefined)).toBeUndefined()
    expect(result.current(msg('telamonjs.common.save'))).toBe('Salvar')
  })

  it('resolves the serializable ref spelling { key, $msg: true } (PRD 068)', () => {
    const { result } = renderHook(() => useText())
    const fromServer = JSON.parse(JSON.stringify({ key: 'telamonjs.common.save', $msg: true }))
    expect(result.current(fromServer)).toBe('Salvar')
  })
})

describe('useTelamonjsT', () => {
  it('is scoped to the telamonjs namespace', () => {
    const { result } = renderHook(() => useTelamonjsT())
    expect(result.current('common.cancel')).toBe('Cancelar')
  })
})
