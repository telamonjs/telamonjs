import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/**
 * PrismaModule — global DB access. Only exposes the client from
 * {{scope}}/shared/prisma (no other shared logic enters here).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
