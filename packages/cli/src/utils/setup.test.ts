import { describe, expect, it, vi } from 'vitest'

const { execa } = vi.hoisted(() => ({ execa: vi.fn() }))
vi.mock('execa', () => ({ default: execa }))

import { runMigrations } from './setup.js'

describe('runMigrations', () => {
  // `prisma migrate dev` asks for a migration name when it has to create one
  // (a MySQL app starts without migrations) and hangs without a terminal.
  it('names the first migration, since it runs without a terminal', async () => {
    await runMigrations('/app', 'pnpm')
    expect(execa).toHaveBeenLastCalledWith('pnpm', ['db:migrate', '--name', 'init'], expect.objectContaining({ cwd: '/app' }))

    await runMigrations('/app', 'npm')
    expect(execa).toHaveBeenLastCalledWith('npm', ['run', 'db:migrate', '--', '--name', 'init'], expect.objectContaining({ cwd: '/app' }))
  })
})
