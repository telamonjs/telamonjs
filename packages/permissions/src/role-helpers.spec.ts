import { describe, it, expect } from 'vitest'
import {
  isAdminRole,
  isSuperAdminRole,
  hasGlobalDataVisibility,
  getPrimaryRole
} from './role-helpers'

const admin = { code: 'admin' }
const superadmin = { code: 'superadmin' }
const agente = { code: 'agente' }

describe('role-helpers', () => {
  it('isAdminRole: roles[] first, singular fallback', () => {
    expect(isAdminRole(null, [agente, admin])).toBe(true)
    expect(isAdminRole(null, [agente])).toBe(false)
    expect(isAdminRole(admin)).toBe(true)
    expect(isAdminRole(superadmin)).toBe(true)
    expect(isAdminRole(agente)).toBe(false)
    // roles[] present ignores the singular role
    expect(isAdminRole(admin, [agente])).toBe(false)
  })

  it('isSuperAdminRole: superadmin only', () => {
    expect(isSuperAdminRole(superadmin)).toBe(true)
    expect(isSuperAdminRole(admin)).toBe(false)
    expect(isSuperAdminRole(null, [superadmin])).toBe(true)
    expect(isSuperAdminRole(null, [admin])).toBe(false)
  })

  it('hasGlobalDataVisibility: admin and superadmin', () => {
    expect(hasGlobalDataVisibility(admin)).toBe(true)
    expect(hasGlobalDataVisibility(superadmin)).toBe(true)
    expect(hasGlobalDataVisibility(agente)).toBe(false)
  })

  it('getPrimaryRole: first of roles[], or singular, or null', () => {
    const a = { id: '1', code: 'admin' }
    const b = { id: '2', code: 'agente' }
    expect(getPrimaryRole(a, [b, a])).toEqual(b)
    expect(getPrimaryRole(a, [])).toEqual(a)
    expect(getPrimaryRole(a)).toEqual(a)
    expect(getPrimaryRole(null)).toBeNull()
    expect(getPrimaryRole()).toBeNull()
  })
})
