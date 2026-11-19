import { PrismaClient, RoleName } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('12345', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Administrador',
      password: hashedPassword,
      role: RoleName.ADMIN,
      ativo: true,
      emailVerified: new Date(),
    },
  })

  console.log('✅ Admin user created:', {
    email: admin.email,
    name: admin.name,
    role: admin.role,
  })

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
