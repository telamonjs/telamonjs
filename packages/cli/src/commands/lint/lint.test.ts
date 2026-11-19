import { describe, expect, it } from 'vitest'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintProject } from './lint.js'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__')

describe('telamonjs lint', () => {
  it('good fixture (cargos) → 0 findings', () => {
    const report = lintProject(join(fixtures, 'good', 'admin'))
    expect(report.files).toBe(3)
    expect(report.findings).toEqual([])
  })

  it('bad fixture (jobs) → the expected rules, with errors', () => {
    const report = lintProject(join(fixtures, 'bad', 'admin'))
    const rules = new Set(report.findings.map((f) => f.rule))
    for (const rule of [
      'list-infinite',
      'list-title-empty',
      'list-pagesize',
      'actions-icon-tooltip',
      'no-fetch-in-config',
      'no-crud-pages',
      'icons-from-registry',
      'no-raw-link',
      'button-icon-size',
    ]) {
      expect(rules, `missing ${rule}`).toContain(rule)
    }
    expect(report.errors).toBeGreaterThan(0)
  })

  it('JSX rules flag only what the AST proves (no-raw-link, button-icon-size, icons-from-registry)', () => {
    const report = lintProject(join(fixtures, 'bad', 'admin'))
    const lines = (rule: string) =>
      report.findings.filter((f) => f.rule === rule && f.file.endsWith('Foo.tsx')).map((f) => f.line)
    // <Link className="underline"> (13) and <a href> (16); target=_blank, download and Button asChild pass
    expect(lines('no-raw-link')).toEqual([13, 16])
    // <Icon className="h-3 w-3"/> (29); h-4 w-4 and non-literal className pass
    expect(lines('button-icon-size')).toEqual([29])
    const lucide = report.findings.filter((f) => f.rule === 'icons-from-registry')
    expect(lucide).toHaveLength(1)
    expect(lucide[0].file.endsWith('jobs/config.tsx')).toBe(true)
    expect(lucide[0].severity).toBe('error')
  })

  it('`// telamonjs-lint-disable-file <regra>` silencia só aquela regra naquele arquivo', () => {
    const report = lintProject(join(fixtures, 'bad', 'admin'))
    const crudPages = report.findings.filter((f) => f.rule === 'no-crud-pages').map((f) => f.file)
    // adicionar/page.tsx continua acusado; [id]/page.tsx tem o diretivo e some
    expect(crudPages.some((f) => f.endsWith('adicionar/page.tsx'))).toBe(true)
    expect(crudPages.some((f) => f.includes('[id]'))).toBe(false)
  })
})
