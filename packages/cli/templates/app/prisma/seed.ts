import { PrismaClient } from '@prisma/client'
import { diffPermissionCatalog } from '@telamonjs/permissions'
import bcrypt from 'bcryptjs'
import { ADMIN_ROLE_CODE, PERMISSIONS, markRoleHoldersStale } from '../src/rbac'

const prisma = new PrismaClient()

// Idempotent: run it again after adding a permission to src/rbac.ts.
async function main() {
  console.log('🌱 Seeding database...')

  // 1. Permission table ← the catalog in code
  const { toCreate, toUpdate, toDelete } = diffPermissionCatalog(
    PERMISSIONS,
    await prisma.permission.findMany()
  )
  await prisma.$transaction([
    prisma.permission.createMany({ data: toCreate }),
    ...toUpdate.map(({ id, category, description }) =>
      prisma.permission.update({ where: { id }, data: { category, description } })
    ),
    // RolePermission rows go with them (onDelete: Cascade)
    prisma.permission.deleteMany({ where: { id: { in: toDelete.map((row) => row.id) } } }),
  ])
  console.log(
    `✅ Permissions: ${toCreate.length} created, ${toUpdate.length} updated, ${toDelete.length} removed`
  )

  // 2. The built-in admin role holds every permission
  const admin = await prisma.role.upsert({
    where: { code: ADMIN_ROLE_CODE },
    update: {},
    create: {
      code: ADMIN_ROLE_CODE,
      name: 'Administrator',
      description: 'Full access. Built-in: holds every permission of the catalog.',
      system: true,
    },
  })
  const granted = await prisma.rolePermission.createMany({
    data: (await prisma.permission.findMany({ select: { id: true } })).map(({ id }) => ({
      roleId: admin.id,
      permissionId: id,
    })),
    skipDuplicates: true,
  })
  if (granted.count > 0 || toDelete.length > 0) await markRoleHoldersStale(prisma, admin.id)

  // 3. The admin user, with the admin role
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Administrator',
      password: await bcrypt.hash('12345', 10),
      active: true,
      emailVerified: new Date(),
    },
  })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: admin.id } },
    update: {},
    create: { userId: user.id, roleId: admin.id },
  })
  console.log('✅ Admin user:', { email: user.email, role: admin.code })

  console.log('\n🎉 Seeding completed!')
  console.log('\n📝 Login credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: 12345')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
