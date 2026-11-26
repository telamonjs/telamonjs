/**
 * `telamonjs db dump`: the command wrapper (execa mocked) and the dump.sh it
 * runs (real bash, stub pg_dump on PATH).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProject, PASSWORD, type Project } from './__fixtures__/project.js'

// `fs` is mocked for dump.ts (the script path), so keep the real existsSync
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

import { runDump } from './dump.js'

class Exit extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${code})`)
  }
}

describe('runDump (command wrapper)', () => {
  let cwd: string
  let logs: string[]

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'telamonjs-dump-cmd-'))
    vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    vi.spyOn(process, 'exit').mockImplementation(code => {
      throw new Exit(code as number | undefined)
    })
    logs = []
    vi.spyOn(console, 'log').mockImplementation((msg?: unknown) => {
      logs.push(String(msg ?? ''))
    })
    execa.mockReset().mockResolvedValue({})
    // The script ships next to dist/ (copy:templates); pretend it is there
    fsExists.mockImplementation(path =>
      String(path).endsWith('templates/database/dump.sh') ? true : existsSync(path)
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    fsExists.mockImplementation(existsSync)
    rmSync(cwd, { recursive: true, force: true })
  })

  it('creates database/dumps and runs dump.sh with bash from the project root', async () => {
    await runDump()

    expect(existsSync(join(cwd, 'database/dumps'))).toBe(true)
    expect(execa).toHaveBeenCalledTimes(1)
    const [cmd, args, opts] = execa.mock.calls[0]
    expect(cmd).toBe('bash')
    expect(args).toHaveLength(1)
    expect(args[0]).toMatch(/templates\/database\/dump\.sh$/)
    expect(opts).toEqual({ cwd, stdio: 'inherit' })
  })

  // A dump is the whole database: it must never be stageable, whatever the
  // app's .gitignore says (apps generated before the template ignored it too).
  it('keeps dumps out of git, also when database/dumps already exists', async () => {
    execFileSync('git', ['init', '-q'], { cwd })
    writeFileSync(join(cwd, '.gitignore'), '*.sql\n')
    mkdirSync(join(cwd, 'database/dumps'), { recursive: true })

    await runDump()

    const ignored = execFileSync('git', ['check-ignore', 'database/dumps/dump_20260101_000000.sql.gz'], {
      cwd,
      encoding: 'utf-8',
    })
    expect(ignored.trim()).toBe('database/dumps/dump_20260101_000000.sql.gz')
  })

  it('passes the custom dump name to the script', async () => {
    await runDump('before-migration')

    expect(execa.mock.calls[0][1]).toEqual([
      expect.stringMatching(/dump\.sh$/),
      'before-migration',
    ])
  })

  it('exits 1 when the script fails, logging only the error message', async () => {
    execa.mockRejectedValue(new Error('Command failed with exit code 1: bash dump.sh'))

    await expect(runDump()).rejects.toEqual(new Exit(1))
    expect(logs.join('\n')).toContain('Failed to create database dump')
    expect(logs.join('\n')).toContain('Command failed with exit code 1')
  })

  it('exits 1 without running anything when the script is missing', async () => {
    fsExists.mockImplementation(path =>
      String(path).endsWith('dump.sh') ? false : existsSync(path)
    )

    await expect(runDump()).rejects.toEqual(new Exit(1))
    expect(execa).not.toHaveBeenCalled()
    expect(logs.join('\n')).toContain('Dump script not found in CLI')
  })
})

describe.skipIf(process.platform === 'win32')('dump.sh (stub pg_dump)', () => {
  let project: Project

  afterEach(() => {
    project.cleanup()
  })

  const dumps = () => readdirSync(join(project.dir, 'database/dumps'))

  it('dumps with the credentials parsed from .env, without printing the password', () => {
    project = createProject()
    const { status, output } = project.run('dump.sh', { args: ['nightly'] })

    expect(status).toBe(0)
    expect(output).toContain('Dump created successfully')
    expect(output).not.toContain(PASSWORD)

    const [call] = project.calls('pg_dump')
    expect(call.args).toEqual([
      '-h', 'db.internal',
      '-p', '6543',
      '-U', 'app_user',
      '-d', 'shop',
      '--no-owner', '--no-acl', '--clean', '--if-exists',
    ])
    // The password reaches pg_dump only through PGPASSWORD
    expect(call.pgpass).toBe(PASSWORD)
    expect(call.args.join(' ')).not.toContain(PASSWORD)

    const [file] = dumps()
    expect(file).toMatch(/^nightly_\d{8}_\d{6}\.sql\.gz$/)
    const sql = gunzipSync(readFileSync(join(project.dir, 'database/dumps', file))).toString()
    expect(sql).toContain('-- fake dump')
  })

  it('names the dump with a timestamp only when no name is given', () => {
    project = createProject()
    expect(project.run('dump.sh').status).toBe(0)
    expect(dumps()[0]).toMatch(/^dump_\d{8}_\d{6}\.sql\.gz$/)
  })

  it('reads a single-quoted DATABASE_URL', () => {
    project = createProject({
      env: `OTHER=1\nDATABASE_URL='postgresql://u:p@localhost:5432/app'\n`,
    })
    expect(project.run('dump.sh').status).toBe(0)
    expect(project.calls('pg_dump')[0].args.slice(0, 8)).toEqual([
      '-h', 'localhost', '-p', '5432', '-U', 'u', '-d', 'app',
    ])
  })

  // Regression: without pipefail, `pg_dump | gzip` reported success with an
  // empty dump that `db restore` would later offer as a valid backup.
  it('fails, keeps no broken dump and does not claim success when pg_dump fails', () => {
    project = createProject()
    const { status, output } = project.run('dump.sh', { env: { PG_DUMP_EXIT: '1' } })

    expect(status).not.toBe(0)
    expect(output).not.toContain('Dump created successfully')
    expect(dumps()).toEqual([])
  })

  it('fails without .env', () => {
    project = createProject({ env: null })
    const { status, output } = project.run('dump.sh')

    expect(status).toBe(1)
    expect(output).toContain('.env not found')
    expect(project.calls('pg_dump')).toEqual([])
  })

  it('fails when .env has no DATABASE_URL', () => {
    project = createProject({ env: 'NEXTAUTH_SECRET=x\n' })
    const { status, output } = project.run('dump.sh')

    expect(status).toBe(1)
    expect(output).toContain('DATABASE_URL not found')
    expect(project.calls('pg_dump')).toEqual([])
  })
})
