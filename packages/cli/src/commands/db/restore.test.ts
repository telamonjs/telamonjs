/**
 * `telamonjs db restore`: the command wrapper (execa mocked) and the
 * interactive restore.sh it runs (real bash, stub psql/pnpm on PATH).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProject, PASSWORD, type Project } from './__fixtures__/project.js'

// `fs` is mocked for restore.ts (the script path), so keep the real existsSync
const { execa, fsExists, real } = vi.hoisted(() => ({
  execa: vi.fn(),
  fsExists: vi.fn<(path: string) => boolean>(),
  real: { existsSync: (_: string): boolean => false },
}))
vi.mock('execa', () => ({ default: execa }))
vi.mock('fs', async importOriginal => {
  const actual = await importOriginal<typeof import('fs')>()
  real.existsSync = actual.existsSync
  fsExists.mockImplementation(actual.existsSync)
  return { ...actual, existsSync: fsExists }
})
const existsSync = (path: string) => real.existsSync(path)

import { runRestore } from './restore.js'

class Exit extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${code})`)
  }
}

describe('runRestore (command wrapper)', () => {
  let cwd: string
  let logs: string[]

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'telamonjs-restore-cmd-'))
    vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    vi.spyOn(process, 'exit').mockImplementation(code => {
      throw new Exit(code as number | undefined)
    })
    logs = []
    vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => {
      logs.push(String(msg ?? ''))
    })
    execa.mockReset().mockResolvedValue({})
    fsExists.mockImplementation(path =>
      String(path).endsWith('templates/database/restore.sh') ? true : existsSync(path)
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    fsExists.mockImplementation(existsSync)
    rmSync(cwd, { recursive: true, force: true })
  })

  it('runs restore.sh interactively from the project root', async () => {
    mkdirSync(join(cwd, 'database/dumps'), { recursive: true })

    await runRestore()

    expect(execa).toHaveBeenCalledWith('bash', [expect.stringMatching(/templates\/database\/restore\.sh$/)], {
      cwd,
      stdio: 'inherit',
    })
  })

  it('exits 1 with a hint when there is no dumps directory', async () => {
    await expect(runRestore()).rejects.toEqual(new Exit(1))

    expect(execa).not.toHaveBeenCalled()
    expect(logs.join('\n')).toContain('Database dumps directory not found')
    expect(logs.join('\n')).toContain('telamonjs db dump')
  })

  it('exits 1 when the script is missing', async () => {
    mkdirSync(join(cwd, 'database/dumps'), { recursive: true })
    fsExists.mockImplementation(path =>
      String(path).endsWith('restore.sh') ? false : existsSync(path)
    )

    await expect(runRestore()).rejects.toEqual(new Exit(1))
    expect(execa).not.toHaveBeenCalled()
    expect(logs.join('\n')).toContain('Restore script not found in CLI')
  })

  it('exits 1 when the script fails', async () => {
    mkdirSync(join(cwd, 'database/dumps'), { recursive: true })
    execa.mockRejectedValue(new Error('Command failed with exit code 1'))

    await expect(runRestore()).rejects.toEqual(new Exit(1))
    expect(logs.join('\n')).toContain('Failed to restore database')
  })
})

describe.skipIf(process.platform === 'win32')('restore.sh (stub psql)', () => {
  let project: Project

  const addDump = (name: string, sql = `-- ${name}`) =>
    writeFileSync(join(project.dir, 'database/dumps', name), gzipSync(sql))

  afterEach(() => {
    project.cleanup()
  })

  it('restores the selected dump with the .env credentials, without printing the password', () => {
    project = createProject()
    addDump('dump_20260101_000000.sql.gz', 'older')
    addDump('dump_20260202_000000.sql.gz', 'newer')

    // Newest first: [1] is the 2026-02-02 dump
    const { status, output } = project.run('restore.sh', { input: '1\ny\n' })

    expect(status).toBe(0)
    expect(output).toContain('Restore completed successfully')
    expect(output).not.toContain(PASSWORD)

    const [check, restore] = project.calls('psql')
    const target = ['-h', 'db.internal', '-p', '6543', '-U', 'app_user', '-d', 'shop']
    expect(check.args).toEqual([...target, '-c', 'SELECT 1'])
    expect(restore.args).toEqual(target)
    expect(restore.stdin).toBe('newer')
    expect(check.pgpass).toBe(PASSWORD)
    expect(restore.pgpass).toBe(PASSWORD)

    // Migrations run after PGPASSWORD is unset
    const [migrate] = project.calls('pnpm')
    expect(migrate.args).toEqual(['prisma', 'migrate', 'deploy'])
    expect(migrate.pgpass).toBe('')
  })

  it.each([
    ['q at the selection', 'q\n'],
    ['n at the confirmation', '1\nn\n'],
  ])('cancels on %s without touching the database', (_label, input) => {
    project = createProject()
    addDump('dump_20260101_000000.sql.gz')

    const { status, output } = project.run('restore.sh', { input })

    expect(status).toBe(0)
    expect(output).toContain('Operation cancelled')
    expect(project.calls('psql')).toEqual([])
  })

  it.each(['9', '0', 'abc'])('rejects the selection %j', selection => {
    project = createProject()
    addDump('dump_20260101_000000.sql.gz')

    const { status, output } = project.run('restore.sh', { input: `${selection}\n` })

    expect(status).toBe(1)
    expect(output).toContain('Invalid selection')
    expect(project.calls('psql')).toEqual([])
  })

  it('fails when there are no dumps', () => {
    project = createProject()
    const { status, output } = project.run('restore.sh')

    expect(status).toBe(1)
    expect(output).toContain('No dumps found')
  })

  it('fails without a dumps directory', () => {
    project = createProject({ dumps: false })
    const { status, output } = project.run('restore.sh')

    expect(status).toBe(1)
    expect(output).toContain('database/dumps/ directory not found')
  })

  // Regression: under `set -e` the `$?` checks were dead code, so a failed
  // connection or restore exited silently, without the error message.
  it('reports a failed connection and restores nothing', () => {
    project = createProject()
    addDump('dump_20260101_000000.sql.gz')

    const { status, output } = project.run('restore.sh', {
      input: '1\ny\n',
      env: { PSQL_EXIT: '2' },
    })

    expect(status).toBe(1)
    expect(output).toContain('Failed to connect to the database')
    expect(project.calls('psql')).toHaveLength(1)
    expect(project.calls('pnpm')).toEqual([])
  })

  it('reports a dump that is not valid gzip instead of claiming success', () => {
    project = createProject()
    writeFileSync(join(project.dir, 'database/dumps/dump_20260101_000000.sql.gz'), 'not gzip')

    const { status, output } = project.run('restore.sh', { input: '1\ny\n' })

    expect(status).toBe(1)
    expect(output).toContain('Failed to restore dump')
    expect(project.calls('pnpm')).toEqual([])
  })

  // Regression: a failed `prisma migrate deploy` aborted the script (set -e)
  // after the data was already restored, so the CLI reported the whole
  // restore as failed instead of printing the documented warning.
  it('only warns when the migrations fail after a successful restore', () => {
    project = createProject()
    addDump('dump_20260101_000000.sql.gz')

    const { status, output } = project.run('restore.sh', {
      input: '1\ny\n',
      env: { PNPM_EXIT: '1' },
    })

    expect(status).toBe(0)
    expect(output).toContain('Failed to apply migrations')
    expect(output).toContain('Restore completed successfully')
  })

  it('fails without .env, after the confirmation and before any psql call', () => {
    project = createProject({ env: null })
    addDump('dump_20260101_000000.sql.gz')

    const { status, output } = project.run('restore.sh', { input: '1\ny\n' })

    expect(status).toBe(1)
    expect(output).toContain('.env not found')
    expect(project.calls('psql')).toEqual([])
  })
})
