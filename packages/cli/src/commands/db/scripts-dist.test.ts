/**
 * `db dump` / `db restore` run dump.sh / restore.sh from dist/templates/database
 * (copied there by the `copy:templates` build step). A copy that fails silently
 * publishes a CLI whose db commands break at runtime -- so it must fail the build.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = fileURLToPath(new URL('../../../', import.meta.url))
const SCRIPTS = ['dump.sh', 'restore.sh']
const copyTemplates = (
  JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8')) as { scripts: Record<string, string> }
).scripts['copy:templates']

describe('copy:templates', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'telamonjs-copy-templates-'))
    mkdirSync(join(dir, 'templates/database'), { recursive: true })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  const run = () => spawnSync('sh', ['-c', copyTemplates], { cwd: dir, encoding: 'utf-8' })

  it('copies every db script into dist', () => {
    for (const script of SCRIPTS) writeFileSync(join(dir, 'templates/database', script), '#!/bin/bash\n')
    expect(run().status).toBe(0)
    for (const script of SCRIPTS) expect(existsSync(join(dir, 'dist/templates/database', script))).toBe(true)
  })

  it.each(SCRIPTS)('fails the build when %s is missing', missing => {
    for (const script of SCRIPTS.filter(s => s !== missing)) {
      writeFileSync(join(dir, 'templates/database', script), '#!/bin/bash\n')
    }
    expect(run().status).not.toBe(0)
  })
})

// Runs after `pnpm build` (CI order): the path dump.ts / restore.ts resolve at runtime
describe('built CLI', () => {
  it.each(SCRIPTS)('ships dist/templates/database/%s', script => {
    expect(existsSync(join(pkgRoot, 'dist/templates/database', script))).toBe(true)
  })
})
