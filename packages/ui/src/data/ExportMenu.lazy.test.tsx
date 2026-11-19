import { describe, it, expect, vi } from 'vitest'

const loaded = vi.hoisted(() => ({ count: 0 }))

// The factory runs only when ./exportUtils is actually evaluated.
vi.mock('./exportUtils', () => {
  loaded.count++
  return { exportToExcel: vi.fn(), exportToCSV: vi.fn(), exportToPDF: vi.fn() }
})

describe('ExportMenu lazy export stack', () => {
  it('does not evaluate exportUtils (xlsx/jspdf) on import or render', async () => {
    const { render } = await import('../test/test-utils')
    const { ExportMenu } = await import('./ExportMenu')
    render(<ExportMenu data={[]} columns={[]} />)
    expect(loaded.count).toBe(0)
  })
})
