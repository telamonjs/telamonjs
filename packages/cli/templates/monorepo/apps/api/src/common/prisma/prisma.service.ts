import { Injectable } from '@nestjs/common'
import { prisma } from '{{scope}}/shared/prisma'
import type { PrismaClient } from '@prisma/client'

/**
 * PrismaService — thin wrapper over the singleton client from
 * {{scope}}/shared/prisma (the same one used by apps/web and apps/jobs).
 * Does not extend PrismaClient nor manage its own connection — the shared
 * package already takes care of that.
 */
@Injectable()
export class PrismaService {
  readonly client: PrismaClient = prisma

  async healthCheck(): Promise<boolean> {
    await this.client.$queryRaw`SELECT 1`
    return true
  }
}
