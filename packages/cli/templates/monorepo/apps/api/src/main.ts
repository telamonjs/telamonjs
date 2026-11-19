// Load the root .env BEFORE any import that reads env vars — same technique
// as apps/jobs (tsx --env-file), but here via dotenv because Nest runs with
// `nest start`/node, not tsx.
import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

const envPaths = [
  resolve(process.cwd(), '.env'), // cwd = monorepo root
  resolve(process.cwd(), '../../.env'), // cwd = apps/api (pnpm --filter)
  '/app/.env', // docker
]
const envPath = envPaths.find((p) => existsSync(p))
if (envPath) {
  config({ path: envPath })
} else {
  console.warn('No .env file found — relying on process environment variables')
}

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter'
import { superJsonMiddleware } from './common/middleware/superjson.middleware'

async function bootstrap() {
  // rawBody: true — future webhooks can verify an HMAC signature computed
  // over the raw request body; req.rawBody is then available on any route.
  const app = await NestFactory.create(AppModule, { rawBody: true })

  // Traefik sits in front without a local proxy — without this the
  // ThrottlerGuard would count by Traefik's own IP and every client would
  // share one bucket.
  app.getHttpAdapter().getInstance().set('trust proxy', 1)

  app.use(helmet())
  app.use(superJsonMiddleware) // before any handler — overrides res.json
  app.use(cookieParser()) // required to read the NextAuth session cookie

  app.useGlobalFilters(new PrismaExceptionFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  app.setGlobalPrefix('v1')

  const port = Number(process.env.API_PORT) || Number('{{apiPort}}')
  await app.listen(port)
  console.log(`{{appName}} API listening on http://localhost:${port}/v1`)
}

bootstrap()
