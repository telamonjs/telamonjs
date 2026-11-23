import { describe, expect, it } from 'vitest'
import { actionEnabled, actionGranted, actionVisible } from './action-access'

describe('action-access', () => {
  it('actionGranted: no permission or no userPermissions = allowed; any of the listed permissions', () => {
    expect(actionGranted(undefined, ['a'])).toBe(true)
    expect(actionGranted('a', undefined)).toBe(true)
    expect(actionGranted('a', ['a'])).toBe(true)
    expect(actionGranted('a', ['b'])).toBe(false)
    expect(actionGranted(['a', 'b'], new Set(['b']))).toBe(true)
    expect(actionGranted(['a', 'b'], [])).toBe(false)
  })

  it('actionVisible / actionEnabled: undefined = true; boolean; function of the row', () => {
    const row = { ativo: false }
    expect(actionVisible({}, row)).toBe(true)
    expect(actionVisible({ visible: false }, row)).toBe(false)
    expect(actionVisible({ visible: (r: typeof row) => r.ativo }, row)).toBe(false)
    expect(actionEnabled({}, row)).toBe(true)
    expect(actionEnabled({ enabled: true }, row)).toBe(true)
    expect(actionEnabled({ enabled: (r: typeof row) => !r.ativo }, row)).toBe(true)
  })
})
