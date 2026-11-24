/**
 * Test helpers for the db commands: a throwaway project directory and stub
 * pg tools (pg_dump, psql, pnpm) on PATH that record how they were called.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SCRIPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../../templates/database')

export const PASSWORD = 'S3cr3t-pw_42'
export const DATABASE_URL = `postgresql://app_user:${PASSWORD}@db.internal:6543/shop?schema=public`

// Each stub logs its argv (one per line), PGPASSWORD and stdin under a
// global call counter, then exits with $<NAME>_EXIT (default 0).
const stub = (name: string, stdout = '') => `#!/bin/sh
n=$(( $(cat "$STUB_LOG/.seq" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$STUB_LOG/.seq"
log="$STUB_LOG/${name}.$(printf %03d "$n")"
printf '%s\\n' "$@" > "$log.args"
printf '%s' "$PGPASSWORD" > "$log.pgpass"
[ -t 0 ] || cat > "$log.stdin"
${stdout ? `printf '%s\\n' '${stdout}'` : ''}
exit \${${name.toUpperCase().replace(/[^A-Z]/g, '_')}_EXIT:-0}
`

export interface Project {
  dir: string
  run: (script: 'dump.sh' | 'restore.sh', opts?: { args?: string[]; input?: string; env?: Record<string, string> }) => {
    status: number | null
    output: string
  }
  calls: (tool: 'pg_dump' | 'psql' | 'pnpm') => Array<{ args: string[]; pgpass: string; stdin: string }>
  cleanup: () => void
}

/** `runDump` creates database/dumps before calling the script; so does this. */
export function createProject({
  env = `DATABASE_URL="${DATABASE_URL}"\n`,
  dumps = true,
}: { env?: string | null; dumps?: boolean } = {}): Project {
  const dir = mkdtempSync(join(tmpdir(), 'telamonjs-db-'))
  const bin = join(dir, '.stub-bin')
  const log = join(dir, '.stub-log')
  mkdirSync(bin)
  mkdirSync(log)
  writeFileSync(join(bin, 'pg_dump'), stub('pg_dump', '-- fake dump'))
  writeFileSync(join(bin, 'psql'), stub('psql'))
  writeFileSync(join(bin, 'pnpm'), stub('pnpm'))
  for (const tool of ['pg_dump', 'psql', 'pnpm']) chmodSync(join(bin, tool), 0o755)
  if (env !== null) writeFileSync(join(dir, '.env'), env)
  if (dumps) mkdirSync(join(dir, 'database/dumps'), { recursive: true })

  return {
    dir,
    run: (script, { args = [], input = '', env: extra = {} } = {}) => {
      const result = spawnSync('bash', [join(SCRIPTS_DIR, script), ...args], {
        cwd: dir,
        input,
        encoding: 'utf-8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, STUB_LOG: log, ...extra },
      })
      return { status: result.status, output: `${result.stdout}${result.stderr}` }
    },
    calls: tool => {
      return readdirSync(log)
        .filter(f => f.startsWith(`${tool}.`) && f.endsWith('.args'))
        .sort()
        .map(f => {
          const base = join(log, f.replace(/\.args$/, ''))
          const read = (ext: string) => (existsSync(`${base}.${ext}`) ? readFileSync(`${base}.${ext}`, 'utf-8') : '')
          return { args: read('args').split('\n').filter(Boolean), pgpass: read('pgpass'), stdin: read('stdin') }
        })
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  }
}
