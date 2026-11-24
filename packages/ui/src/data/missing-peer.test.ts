import { describe, it, expect, vi } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import { MissingPeerError, isModuleNotFound } from './missing-peer'

// The app did not install jspdf: resolving it fails like a bundler would.
vi.mock('jspdf', () => {
  throw Object.assign(new Error("Cannot find module 'jspdf'"), { code: 'MODULE_NOT_FOUND' })
})

describe('MissingPeerError', () => {
  it('names the packages and how to install them', () => {
    const error = new MissingPeerError(['jspdf', 'jspdf-autotable'])
    expect(error.name).toBe('MissingPeerError')
    expect(error.packages).toEqual(['jspdf', 'jspdf-autotable'])
    expect(error.message).toContain('pnpm add jspdf jspdf-autotable')
  })
})

describe('isModuleNotFound', () => {
  it('recognizes webpack, Node and Vite resolution failures, also as a cause', () => {
    expect(isModuleNotFound(Object.assign(new Error('x'), { code: 'MODULE_NOT_FOUND' }))).toBe(true)
    expect(isModuleNotFound(Object.assign(new Error('x'), { code: 'ERR_MODULE_NOT_FOUND' }))).toBe(true)
    expect(isModuleNotFound(new Error('Failed to resolve import "jspdf"'))).toBe(true)
    expect(isModuleNotFound(new Error('wrapped', { cause: new Error("Cannot find module 'jspdf'") }))).toBe(true)
  })
  it('leaves other failures alone (network, chunk loading)', () => {
    expect(isModuleNotFound(new Error('Loading chunk 12 failed'))).toBe(false)
    expect(isModuleNotFound('Cannot find module')).toBe(false)
  })
})

describe('exportToPDF without the jspdf peer', () => {
  it('rejects with a MissingPeerError naming both packages', async () => {
    const { exportToPDF } = await import('./exportUtils')
    const cols: ColumnDef<{ a: number }>[] = [{ header: 'A', accessorKey: 'a' }]
    const t = ((k: string) => k) as never
    const error = await exportToPDF([{ a: 1 }], cols, 'x', { t, locale: 'en' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MissingPeerError)
    expect((error as MissingPeerError).packages).toEqual(['jspdf', 'jspdf-autotable'])
  })
})
