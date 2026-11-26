import { describe, it, expect, vi, beforeEach } from 'vitest'

const { execaSync } = vi.hoisted(() => ({ execaSync: vi.fn() }))
vi.mock('execa', () => ({ default: { sync: execaSync } }))

import { formatWithPrettier } from './crud.js'

describe('formatWithPrettier', () => {
  beforeEach(() => {
    execaSync.mockReset()
  })

  it('passes each path as its own argument, so spaces survive, and never installs prettier', () => {
    execaSync.mockReturnValue({ exitCode: 0 })
    const paths = ['/my app/src/app/admin/clientes/config.tsx', '/my app/src/lib/api/clientes-client.ts']

    expect(formatWithPrettier(paths, '/my app')).toBeUndefined()
    expect(execaSync).toHaveBeenCalledWith('npx', ['--no-install', 'prettier', '--write', ...paths], { cwd: '/my app' })
  })

  it('returns a warning with the reason when prettier fails', () => {
    execaSync.mockImplementation(() => {
      throw Object.assign(new Error('Command failed with exit code 2: npx prettier'), {
        shortMessage: 'Command failed with exit code 2: npx prettier',
        stderr: '[error] config.tsx: SyntaxError: Unexpected token (3:1)\n[error] more',
      })
    })

    const warning = formatWithPrettier(['/app/config.tsx'], '/app')
    expect(warning).toContain('[error] config.tsx: SyntaxError: Unexpected token (3:1)')
    expect(warning).toMatch(/still valid, just unformatted/)
  })

  it('falls back to the error message when there is no stderr', () => {
    execaSync.mockImplementation(() => {
      throw new Error('spawn npx ENOENT')
    })

    expect(formatWithPrettier(['/app/config.tsx'], '/app')).toContain('spawn npx ENOENT')
  })
})
