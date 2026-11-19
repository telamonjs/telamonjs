import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { Public } from '../../common/decorators/public.decorator'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const dbHealthy = await this.prisma.healthCheck().catch(() => false)
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealthy ? 'connected' : 'disconnected',
    }
  }
}
