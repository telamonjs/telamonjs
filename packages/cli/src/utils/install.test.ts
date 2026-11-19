import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { detectPackageManager } from './install.js'

describe('detectPackageManager', () => {
  const saved = { ua: process.env.npm_config_user_agent, dev: process.env.TELAMONJS_DEV, cwd: process.cwd() }
  // Empty dir: no lockfile can decide for us.
  const dir = mkdtempSync(join(tmpdir(), 'telamonjs-pm-'))

  afterEach(() => {
    process.chdir(saved.cwd)
    if (saved.ua === undefined) delete process.env.npm_config_user_agent
    else process.env.npm_config_user_agent = saved.ua
    if (saved.dev === undefined) delete process.env.TELAMONJS_DEV
    else process.env.TELAMONJS_DEV = saved.dev
    rmSync(dir, { recursive: true, force: true })
  })

  it('follows the launcher in npm_config_user_agent (pnpm dlx / yarn dlx), falls back to npm', () => {
    delete process.env.TELAMONJS_DEV
    process.chdir(dir)

    process.env.npm_config_user_agent = 'pnpm/9.15.9 npm/? node/v22.23.4 darwin arm64'
    expect(detectPackageManager()).toBe('pnpm')
    process.env.npm_config_user_agent = 'yarn/4.5.0 npm/? node/v22.23.4 darwin arm64'
    expect(detectPackageManager()).toBe('yarn')
    process.env.npm_config_user_agent = 'npm/10.9.0 node/v22.23.4 darwin arm64 workspaces/false'
    expect(detectPackageManager()).toBe('npm')
    delete process.env.npm_config_user_agent
    expect(detectPackageManager()).toBe('npm')
  })
})
