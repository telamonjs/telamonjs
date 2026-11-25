/**
 * Date field limits (`minDate`/`maxDate`) — one module for the
 * calendar (disabled days) and the form resolver (typed values), so both read
 * dates and compare days the same way.
 */

/** Another field's day, shifted by `offsetDays` (`{ field: 'start', offsetDays: 1 }` = strictly after it). */
export interface DateFieldLimit {
  field: string
  offsetDays?: number
}

/**
 * Static day, `'today'` (the viewer's today), another field's day
 * (`{ field, offsetDays? }`) or a function of the form values.
 */
export type DateLimit =
  | Date
  | string
  | 'today'
  | DateFieldLimit
  | ((values: Record<string, unknown>) => Date | string | null | undefined)

/** The field a `{ field }` limit follows (undefined for any other limit). */
export const dateLimitField = (limit: DateLimit | undefined): string | undefined =>
  typeof limit === 'object' && !(limit instanceof Date) ? limit.field : undefined

/** Converts a field value (Date | ISO string) into a valid Date, or undefined */
export const toValidDate = (value: unknown): Date | undefined => {
  if (!value) return undefined
  try {
    const date = typeof value === 'string' ? new Date(value) : (value as Date)
    return date instanceof Date && !isNaN(date.getTime()) ? date : undefined
  } catch {
    return undefined
  }
}

// An instant at exactly 00:00:00.000Z is a date-only value (e.g. a Prisma
// DateTime for a date-only column): read its calendar day in UTC so it does not
// slip to the previous day in UTC-negative zones. Any other instant is a real
// moment (the calendar/typing path saves local noon) and keeps local getters.
const isDateOnlyInstant = (date: Date): boolean =>
  date.getTime() % 86_400_000 === 0

/** Calendar day (as a local-midnight Date) of a field value; undefined when invalid. */
export const toCalendarDay = (value: unknown): Date | undefined => {
  const date = toValidDate(value)
  if (!date) return undefined
  return isDateOnlyInstant(date)
    ? new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    : new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** The limit as a local-midnight day (undefined = no limit / not resolvable yet). */
export function resolveDateLimit(
  limit: DateLimit | undefined,
  values: Record<string, unknown>,
  now: Date = new Date()
): Date | undefined {
  if (!limit) return undefined
  if (limit === 'today') return toCalendarDay(now)
  const field = dateLimitField(limit)
  if (field !== undefined) {
    const day = toCalendarDay(values[field])
    const offset = (limit as DateFieldLimit).offsetDays ?? 0
    // Local-midnight day + n days: setDate stays on midnight across DST
    if (day) day.setDate(day.getDate() + offset)
    return day
  }
  const raw = typeof limit === 'function' ? limit(values) : (limit as Date | string)
  return raw ? toCalendarDay(raw) : undefined
}

export interface DateLimitField {
  name: string
  type?: string
  minDate?: DateLimit
  maxDate?: DateLimit
}

/** Fields whose value breaks their own limit → `{ name: { kind, limit } }` (empty values pass: `required` is another rule). */
export function dateLimitViolations(
  fields: readonly DateLimitField[],
  values: Record<string, unknown>,
  now: Date = new Date()
): Record<string, { kind: 'min' | 'max'; limit: Date }> {
  const out: Record<string, { kind: 'min' | 'max'; limit: Date }> = {}
  for (const f of fields) {
    if (!f.minDate && !f.maxDate) continue
    const day = toCalendarDay(values[f.name])
    if (!day) continue
    const min = resolveDateLimit(f.minDate, values, now)
    const max = resolveDateLimit(f.maxDate, values, now)
    if (min && day < min) out[f.name] = { kind: 'min', limit: min }
    else if (max && day > max) out[f.name] = { kind: 'max', limit: max }
  }
  return out
}
