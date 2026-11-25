'use client'

import { useState, type ReactNode } from 'react'
import { useTelamonjsT } from '../../i18n/use-t'
import { Button } from '../../ui/button'
import { cn } from '../../utils'

export interface AuditChangesViewerProps {
  /**
   * The entry's payload: a `{ field: { old, new } }` (or `{ field: { from, to } }`, or `{ field: { before, after } }`,
   * as `@telamonjs/logger` `audit()` writes) diff, a `{ before, after }`
   * pair, or any object (request body, metadata) shown as key/value. A JSON
   * string is parsed first.
   */
  changes?: unknown
  /** Snapshot before the change; with `after`, the viewer computes the field diff. Takes precedence over `changes`. */
  before?: unknown
  /** Snapshot after the change. */
  after?: unknown
  /**
   * Extra keys to mask, added to the built-in password/token/secret-like ones.
   * Matched case-insensitively as a substring, ignoring `_` and `-`, at any depth.
   */
  redactKeys?: readonly string[]
  className?: string
}

// Key names (data, not UI text), normalized: lowercase, no `_`/`-`. `senha` covers pt-BR schemas.
// ponytail: substring match also masks harmless keys like `tokenCount` — errs on the safe side.
const DEFAULT_REDACT = ['password', 'passwd', 'senha', 'secret', 'token', 'apikey', 'authorization', 'cookie', 'privatekey']

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const normalize = (k: string) => k.toLowerCase().replace(/[_-]/g, '')

function parse(v: unknown): unknown {
  if (typeof v !== 'string') return v
  try {
    return JSON.parse(v)
  } catch {
    return v
  }
}

/** Per-field diff entry: `{ old, new }` (common API shape), `{ before, after }` (@telamonjs/logger `audit()`) or `{ from, to }`. */
function diffEntry(v: unknown): [unknown, unknown] | undefined {
  if (!isObj(v)) return undefined
  const keys = Object.keys(v)
  if (keys.length === 0) return undefined
  if (keys.every(k => k === 'old' || k === 'new')) return [v.old, v.new]
  if (keys.every(k => k === 'before' || k === 'after')) return [v.before, v.after]
  if (keys.every(k => k === 'from' || k === 'to')) return [v.from, v.to]
  return undefined
}

function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => isEqual(x, b[i]))
  if (isObj(a) && isObj(b)) {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every(k => k in b && isEqual(a[k], b[k]))
  }
  return false
}

interface Row {
  key: string
  before?: unknown
  after?: unknown
  changed?: boolean
}

/**
 * AuditChangesViewer - renders what an audit entry recorded.
 *
 * Detects the payload shape: a `{ field: { old, new } }` diff becomes a
 * field/before/after table; `before`/`after` snapshots are diffed here (changed
 * fields first, toggle to show all); anything else is a key/value list with nested
 * values pretty-printed in collapsible blocks. Password/token/secret-like keys are masked.
 *
 * @example
 * ```tsx
 * <AuditChangesViewer changes={log.changes} />
 * <AuditChangesViewer before={log.before} after={log.after} redactKeys={['taxId']} />
 * ```
 */
export function AuditChangesViewer({ changes, before, after, redactKeys = [], className }: AuditChangesViewerProps) {
  const t = useTelamonjsT()
  const [showAll, setShowAll] = useState(false)

  const patterns = [...DEFAULT_REDACT, ...redactKeys.map(normalize)]
  const secret = (key: string) => patterns.some(p => normalize(key).includes(p))
  const redacted = t('admin.auditChanges.redacted')

  const renderValue = (key: string, v: unknown): ReactNode => {
    if (secret(key)) return <span className='italic text-muted-foreground'>{redacted}</span>
    if (v === undefined) return <span className='text-muted-foreground'>—</span>
    if (v === null) return <span className='italic text-muted-foreground'>null</span>
    if (typeof v !== 'object') return String(v)
    return (
      <details>
        <summary className='cursor-pointer text-muted-foreground'>
          {t('admin.auditChanges.entries', { count: Object.keys(v).length })}
        </summary>
        <pre className='mt-1 whitespace-pre-wrap break-all text-xs'>
          {JSON.stringify(v, (k, x: unknown) => (k && secret(k) ? redacted : x), 2)}
        </pre>
      </details>
    )
  }

  // Shape detection: explicit before/after > { before, after } in changes > diff > plain object.
  let payload = parse(changes)
  let pair: [unknown, unknown] | undefined
  if (before !== undefined || after !== undefined) pair = [parse(before), parse(after)]
  else if (isObj(payload) && Object.keys(payload).length > 0 && Object.keys(payload).every(k => k === 'before' || k === 'after'))
    pair = [parse(payload.before), parse(payload.after)]

  let rows: Row[] | undefined
  let diff = pair !== undefined
  if (pair) {
    const [b, a] = [isObj(pair[0]) ? pair[0] : {}, isObj(pair[1]) ? pair[1] : {}]
    rows = [...new Set([...Object.keys(b), ...Object.keys(a)])].map(key => ({
      key,
      before: b[key],
      after: a[key],
      changed: !isEqual(b[key], a[key]),
    }))
    payload = undefined
  } else if (isObj(payload) && Object.keys(payload).length > 0) {
    const entries = Object.entries(payload)
    const diffs = entries.map(([, v]) => diffEntry(v))
    diff = diffs.every(d => d !== undefined)
    rows = entries.map(([key, v], i) => {
      const d = diffs[i]
      return diff && d ? { key, before: d[0], after: d[1] } : { key, after: v }
    })
  }

  const empty = <p className='text-sm italic text-muted-foreground'>{t('admin.auditChanges.empty')}</p>
  if (!rows) {
    if (payload === undefined || payload === null || payload === '' || isObj(payload)) return <div className={className}>{empty}</div>
    return (
      <pre className={cn('whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 text-xs', className)}>
        {typeof payload === 'string' ? payload : JSON.stringify(payload, (k, x: unknown) => (k && secret(k) ? redacted : x), 2)}
      </pre>
    )
  }
  if (rows.length === 0) return <div className={className}>{empty}</div>

  const computed = pair !== undefined
  const visible = computed && !showAll ? rows.filter(r => r.changed) : rows
  const th = 'px-3 py-2 text-left font-medium'
  const td = 'break-all px-3 py-2 align-top font-mono text-xs'

  return (
    <div className={cn('space-y-2', className)}>
      {computed && (
        <div className='flex flex-wrap items-center justify-between gap-2'>
          {visible.length === 0 ? (
            <p className='text-sm italic text-muted-foreground'>{t('admin.auditChanges.noChangedFields')}</p>
          ) : (
            <span />
          )}
          <Button
            type='button'
            variant='ghost'
            size='sm'
            aria-pressed={showAll}
            onClick={() => setShowAll(s => !s)}
            data-testid='audit-changes-toggle'
          >
            {showAll ? t('admin.auditChanges.showChanged') : t('admin.auditChanges.showAll', { count: rows.length })}
          </Button>
        </div>
      )}
      {visible.length > 0 && (
        <div className='overflow-x-auto rounded-md border'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50 text-muted-foreground'>
              <tr>
                <th scope='col' className={th}>{t('admin.auditChanges.field')}</th>
                {diff ? (
                  <>
                    <th scope='col' className={th}>{t('admin.auditChanges.before')}</th>
                    <th scope='col' className={th}>{t('admin.auditChanges.after')}</th>
                  </>
                ) : (
                  <th scope='col' className={th}>{t('admin.auditChanges.value')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.key} className={cn('border-t', computed && !r.changed && 'text-muted-foreground')}>
                  <th scope='row' className='px-3 py-2 text-left align-top font-medium'>{r.key}</th>
                  {diff ? (
                    <>
                      <td className={cn(td, r.changed !== false && 'text-red-700 dark:text-red-400')}>{renderValue(r.key, r.before)}</td>
                      <td className={cn(td, r.changed !== false && 'text-green-700 dark:text-green-400')}>{renderValue(r.key, r.after)}</td>
                    </>
                  ) : (
                    <td className={td}>{renderValue(r.key, r.after)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
