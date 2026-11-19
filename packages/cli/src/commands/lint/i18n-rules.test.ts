import { describe, expect, it } from 'vitest'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintProject } from './lint.js'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__')
const adminDir = join(fixtures, 'i18n', 'src', 'app', 'admin')

describe('i18n-literal-in-config', () => {
  it('produtos (msg() everywhere) -> no i18n-literal-in-config findings', () => {
    const report = lintProject(adminDir)
    const findings = report.findings.filter(
      (f) => f.rule === 'i18n-literal-in-config' && f.file.includes('produtos')
    )
    expect(findings).toEqual([])
  })

  it("pedidos (literal pt-BR in title:/header:/FormField.label, app HAS i18n) -> flagged, label: 'Nome' (no accent/word) is not", () => {
    const report = lintProject(adminDir)
    const findings = report.findings.filter(
      (f) => f.rule === 'i18n-literal-in-config' && f.file.includes('pedidos')
    )
    expect(findings.every((f) => f.severity === 'error')).toBe(true)
    // module.title ('Detalhes dos Pedidos' -- "Detalhes") + column header ('Descrição' -- accent)
    // + FormField.label ('Endereço' -- accent, UI chrome).
    expect(findings).toHaveLength(3)
    expect(findings.some((f) => f.message.includes('Detalhes dos Pedidos'))).toBe(true)
    expect(findings.some((f) => f.message.includes('Descrição'))).toBe(true)
    expect(findings.some((f) => f.message.includes("label: 'Endereço'"))).toBe(true)
  })

  it("IOption-shaped label ({ value, label } from loadField) is domain data, not chrome -- never flagged, even accented", () => {
    const report = lintProject(adminDir)
    const findings = report.findings.filter(
      (f) => f.rule === 'i18n-literal-in-config' && f.file.includes('pedidos')
    )
    // 'José da Silva' and 'Endereço Comercial' are IOption.label values (sibling
    // `value:` in the same object literal) -- accented, but domain data, not chrome.
    expect(findings.some((f) => f.message.includes('José da Silva'))).toBe(false)
    expect(findings.some((f) => f.message.includes('Endereço Comercial'))).toBe(false)
  })

  it('an app WITHOUT i18n set up never gets i18n-literal-in-config, even with the same kind of literals', () => {
    const report = lintProject(join(fixtures, 'bad', 'admin'))
    expect(report.findings.some((f) => f.rule === 'i18n-literal-in-config')).toBe(false)
  })
})

describe('i18n-untranslated', () => {
  it('flags messages/{en,es}.json keys whose value is byte-identical to pt-BR.json', () => {
    const report = lintProject(adminDir)
    const findings = report.findings.filter((f) => f.rule === 'i18n-untranslated')
    expect(findings.every((f) => f.severity === 'warning')).toBe(true)

    const en = findings.filter((f) => f.file.endsWith('en.json'))
    const es = findings.filter((f) => f.file.endsWith('es.json'))
    // en.json only left `title` untranslated; es.json is a full untranslated stub.
    expect(en.map((f) => f.message).join()).toContain('produtos.title')
    expect(en).toHaveLength(1)
    expect(es).toHaveLength(3)
  })

  it('a project with no messages/ dir gets no i18n-untranslated findings', () => {
    const report = lintProject(join(fixtures, 'good', 'admin'))
    expect(report.findings.some((f) => f.rule === 'i18n-untranslated')).toBe(false)
  })
})
