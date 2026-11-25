/**
 * System parameters: settings stored as text in the `Parameter` table and read
 * through their `type`. Server-only (Prisma).
 */
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const PARAMETER_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'] as const
export type ParameterType = (typeof PARAMETER_TYPES)[number]

/** The body of POST /api/parameters (PATCH takes any part of it). */
export const parameterSchema = z.object({
  key: z.string().regex(/^[A-Za-z0-9_.-]+$/, 'Key: letters, digits, ., - and _'),
  value: z.string(),
  type: z.enum(PARAMETER_TYPES).default('STRING'),
  description: z.string().nullish(),
  group: z.string().nullish(),
  public: z.boolean().default(false),
})

/** `value` read as `type`. Throws when it does not parse. */
export function parseParameterValue(type: string, value: string): unknown {
  switch (type) {
    case 'NUMBER': {
      const number = Number(value)
      if (value.trim() === '' || !Number.isFinite(number)) throw new Error(`Not a number: "${value}"`)
      return number
    }
    case 'BOOLEAN':
      if (value !== 'true' && value !== 'false') throw new Error(`Not a boolean: "${value}" (true or false)`)
      return value === 'true'
    case 'JSON':
      return JSON.parse(value)
    default:
      return value
  }
}

/** The error message when `value` does not parse as `type`, else null. */
export function invalidValue(type: string, value: string): string | null {
  try {
    parseParameterValue(type, value)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid value'
  }
}

/**
 * A parameter's value, typed by its `type`, or `fallback` when the key is
 * missing or its value does not parse.
 *
 * @example
 * const maxUploadMb = await getParameter('uploads.maxMb', 10)
 */
export async function getParameter<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.parameter.findUnique({ where: { key } })
  if (!row) return fallback
  try {
    return parseParameterValue(row.type, row.value) as T
  } catch {
    return fallback
  }
}
