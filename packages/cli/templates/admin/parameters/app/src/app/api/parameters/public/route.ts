import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseParameterValue } from '@/lib/parameters'

/**
 * GET /api/parameters/public?keys=a,b — no session: `{ key: value }` of the
 * requested parameters marked `public`, typed. Private, unknown or
 * unparsable keys are simply absent.
 */
export async function GET(request: NextRequest) {
  const keys = (new URL(request.url).searchParams.get('keys') ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
  if (keys.length === 0) return NextResponse.json({})

  const rows = await prisma.parameter.findMany({
    where: { key: { in: keys.slice(0, 100) }, public: true },
    select: { key: true, value: true, type: true },
  })
  const values: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      values[row.key] = parseParameterValue(row.type, row.value)
    } catch {
      // unparsable: left out
    }
  }
  return NextResponse.json(values)
}
