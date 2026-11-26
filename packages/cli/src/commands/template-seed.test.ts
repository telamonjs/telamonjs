/**
 * The template's `prisma/seed.ts` (single app and monorepo packages/shared),
 * run for real against an in-memory Prisma stand-in. The seed is re-run as
 * catalog sync (after every new permission, and on every container start):
 * it must reconcile permissions without touching the accounts an operator
 * already manages.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

interface User {
  id: string
  email: string
  password: string
}
interface Store {
  permissions: { id: string; code: string; category: string | null; description: string | null }[]
  roles: { id: string; code: string }[]
  rolePermissions: { roleId: string; permissionId: string }[]
  users: User[]
  userRoles: { userId: string; roleId: string }[]
}

const state = vi.hoisted(() => ({
  db: undefined as unknown as Store,
  nextId: 0,
  disconnected: (): void => undefined,
}))

vi.mock('bcryptjs', () => ({ default: { hash: async (plain: string) => `hash:${plain}` } }))

vi.mock('@prisma/client', () => {
  const id = () => `id${++state.nextId}`
  type Data = Record<string, unknown>
  class PrismaClient {
    permission = {
      findMany: async () => state.db.permissions.map((row) => ({ ...row })),
      createMany: async ({ data }: { data: Data[] }) => {
        for (const row of data) state.db.permissions.push({ id: id(), ...row } as Store['permissions'][number])
        return { count: data.length }
      },
      update: async ({ where, data }: { where: { id: string }; data: Data }) =>
        Object.assign(state.db.permissions.find((p) => p.id === where.id)!, data),
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        state.db.permissions = state.db.permissions.filter((p) => !where.id.in.includes(p.id))
        state.db.rolePermissions = state.db.rolePermissions.filter((rp) => !where.id.in.includes(rp.permissionId))
        return { count: where.id.in.length }
      },
    }
    role = {
      upsert: async ({ where, create }: { where: { code: string }; create: Data }) => {
        let role = state.db.roles.find((r) => r.code === where.code)
        if (!role) state.db.roles.push((role = { id: id(), code: String(create.code) }))
        return role
      },
    }
    rolePermission = {
      createMany: async ({ data }: { data: { roleId: string; permissionId: string }[] }) => {
        const fresh = data.filter(
          (d) => !state.db.rolePermissions.some((rp) => rp.roleId === d.roleId && rp.permissionId === d.permissionId)
        )
        state.db.rolePermissions.push(...fresh)
        return { count: fresh.length }
      },
    }
    user = {
      count: async () => state.db.users.length,
      updateMany: async () => ({ count: 0 }),
      create: async ({ data }: { data: Data & { roles?: { create: { roleId: string } } } }) => {
        const user = { id: id(), email: String(data.email), password: String(data.password) }
        state.db.users.push(user)
        if (data.roles) state.db.userRoles.push({ userId: user.id, roleId: data.roles.create.roleId })
        return user
      },
    }
    $transaction = (ops: Promise<unknown>[]) => Promise.all(ops)
    $disconnect = async () => state.disconnected()
  }
  return { PrismaClient }
})

/** Runs the template seed once, as `pnpm db:seed` would. */
async function seed(): Promise<void> {
  const done = new Promise<void>((resolve) => {
    state.disconnected = resolve
  })
  vi.resetModules()
  await import('../../templates/app/prisma/seed.ts')
  await done
  await new Promise((resolve) => setTimeout(resolve, 0)) // let a catch() reach process.exit
}

const adminRoleId = () => state.db.roles.find((r) => r.code === 'admin')!.id
const rolesOf = (userId: string) => state.db.userRoles.filter((ur) => ur.userId === userId).map((ur) => ur.roleId)

describe('template prisma/seed.ts', () => {
  let exit: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    state.db = { permissions: [], roles: [], rolePermissions: [], users: [], userRoles: [] }
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('creates the default admin, with the admin role, on an empty database', async () => {
    await seed()

    expect(state.db.users).toEqual([{ id: expect.any(String), email: 'admin@example.com', password: 'hash:12345' }])
    expect(rolesOf(state.db.users[0].id)).toEqual([adminRoleId()])
    expect(state.db.rolePermissions).toHaveLength(state.db.permissions.length)
    expect(exit).not.toHaveBeenCalled()
  })

  it('never re-creates the default admin after the operator renamed it', async () => {
    await seed()
    Object.assign(state.db.users[0], { email: 'ops@corp.example', password: 'hash:operator-secret' })

    await seed()

    expect(state.db.users).toEqual([
      { id: expect.any(String), email: 'ops@corp.example', password: 'hash:operator-secret' },
    ])
  })

  it('never re-grants the admin role to an account the operator demoted', async () => {
    await seed()
    const [user] = state.db.users
    state.db.userRoles = []

    await seed()

    expect(rolesOf(user.id)).toEqual([])
    expect(state.db.users).toHaveLength(1)
  })

  it('still syncs the permission catalog on a re-run', async () => {
    await seed()
    state.db.rolePermissions = state.db.rolePermissions.slice(1)
    state.db.permissions.push({ id: 'gone', code: 'legacy.read', category: null, description: null })

    await seed()

    expect(state.db.permissions.map((p) => p.code)).not.toContain('legacy.read')
    expect(state.db.rolePermissions).toHaveLength(state.db.permissions.length)
  })

  it('takes the first admin password from SEED_ADMIN_PASSWORD', async () => {
    vi.stubEnv('SEED_ADMIN_PASSWORD', 'from-env')
    await seed()

    expect(state.db.users[0].password).toBe('hash:from-env')
  })

  it('needs no SEED_ADMIN_PASSWORD in production once users exist', async () => {
    await seed()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SEED_ADMIN_PASSWORD', '')

    await seed()

    expect(exit).not.toHaveBeenCalled()
    expect(state.db.users).toHaveLength(1)
  })

  it('refuses the default password in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SEED_ADMIN_PASSWORD', '')
    await seed()

    expect(state.db.users).toEqual([])
    expect(exit).toHaveBeenCalledWith(1)
    // the catalog is synced before the bootstrap step fails
    expect(state.db.permissions.length).toBeGreaterThan(0)
  })
})
