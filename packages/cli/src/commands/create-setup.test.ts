/**
 * `telamonjs create` when the automatic setup (docker, migrate, seed) fails:
 * the run still finishes, but says why and shows the manual steps.
 * Install, git and setup are mocked -- no network, no subprocess.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { setupAppTemplate } = vi.hoisted(() => ({ setupAppTemplate: vi.fn() }))
vi.mock('../utils/index.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../utils/index.js')>()),
  installDependencies: vi.fn(),
  initGit: vi.fn(),
  copyTemplate: vi.fn(),
  detectPackageManager: () => 'pnpm',
  setupAppTemplate,
}))

import { createApp } from './create.js'

describe('createApp — automatic setup failure', () => {
  let workDir: string
  let output: string

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'telamonjs-create-setup-'))
    vi.spyOn(process, 'cwd').mockReturnValue(workDir)
    output = ''
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      output += `${args.join(' ')}\n`
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(workDir, { recursive: true, force: true })
  })

  it('prints the setup error, a hint and the manual steps, and does not claim the app is ready', async () => {
    setupAppTemplate.mockRejectedValue(new Error('docker compose up failed: port 5432 is already allocated'))
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await createApp('setup-fails', { provider: 'postgresql', port: 3001, skipGit: true, monorepo: false })

    expect(exit).not.toHaveBeenCalled()
    expect(output).toContain('docker compose up failed: port 5432 is already allocated')
    expect(output).toMatch(/Docker is running/)
    expect(output).toContain('pnpm db:migrate')
    expect(output).not.toContain('Your app is ready to use')
  })

  it('says the app is ready when the setup succeeds', async () => {
    setupAppTemplate.mockResolvedValue(undefined)

    await createApp('setup-works', { provider: 'postgresql', port: 3001, skipGit: true, monorepo: false })

    expect(output).toContain('Your app is ready to use')
  })
})
