import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { Public } from '@telamonjs/auth/nest'
import { HealthModule } from '@telamonjs/data/nest'
import { PrismaModule } from './common/prisma/prisma.module'
import { PrismaService } from './common/prisma/prisma.service'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { UsuariosModule } from './modules/usuarios/usuarios.module'

/**
 * AppModule — API root. Add new domain modules to `imports` following the
 * same shape as UsuariosModule (controller + service + dto/, no Prisma
 * calls outside the service).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 300 },
    ]),
    PrismaModule,
    // GET /v1/health — 200, or 503 when the database does not answer
    HealthModule.forRoot({
      decorators: [Public()],
      inject: [PrismaService],
      checks: (prisma: PrismaService) => ({ database: () => prisma.client.$queryRaw`SELECT 1` }),
    }),
    UsuariosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
