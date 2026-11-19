import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { hasI18n, writeModuleMessages } from './messages-writer.js'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'messages-writer-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('writeModuleMessages', () => {
  it('writes the block under moduleKey in all 3 locale files', () => {
    mkdirSync(join(root, 'messages'))
    for (const locale of ['pt-BR', 'en', 'es']) {
      writeFileSync(join(root, 'messages', `${locale}.json`), '{}\n')
    }

    writeModuleMessages(root, 'produtos', { title: 'Produtos', fields: { nome: 'Nome' } })

    for (const locale of ['pt-BR', 'en', 'es']) {
      const raw = readFileSync(join(root, 'messages', `${locale}.json`), 'utf-8')
      expect(raw.endsWith('\n')).toBe(true)
      const data = JSON.parse(raw)
      expect(data.produtos.title).toBe('Produtos')
      expect(data.produtos.fields.nome).toBe('Nome')
    }
  })

  it('preserves existing keys and their order, appending the new module at the end', () => {
    mkdirSync(join(root, 'messages'))
    writeFileSync(join(root, 'messages', 'pt-BR.json'), JSON.stringify({ usuarios: { title: 'Usuários' } }, null, 2))
    writeFileSync(join(root, 'messages', 'en.json'), '{}\n')
    writeFileSync(join(root, 'messages', 'es.json'), '{}\n')

    writeModuleMessages(root, 'produtos', { title: 'Produtos' })

    const data = JSON.parse(readFileSync(join(root, 'messages', 'pt-BR.json'), 'utf-8'))
    expect(Object.keys(data)).toEqual(['usuarios', 'produtos'])
  })

  it('throws when moduleKey already exists and force is not set', () => {
    mkdirSync(join(root, 'messages'))
    for (const locale of ['pt-BR', 'en', 'es']) {
      writeFileSync(join(root, 'messages', `${locale}.json`), JSON.stringify({ produtos: { title: 'Old' } }))
    }

    expect(() => writeModuleMessages(root, 'produtos', { title: 'New' })).toThrow()
  })

  it('overwrites when moduleKey already exists and force is set', () => {
    mkdirSync(join(root, 'messages'))
    for (const locale of ['pt-BR', 'en', 'es']) {
      writeFileSync(join(root, 'messages', `${locale}.json`), JSON.stringify({ produtos: { title: 'Old' } }))
    }

    writeModuleMessages(root, 'produtos', { title: 'New' }, { force: true })

    const data = JSON.parse(readFileSync(join(root, 'messages', 'pt-BR.json'), 'utf-8'))
    expect(data.produtos.title).toBe('New')
  })

  it('no-op, does not throw and creates nothing, when the app has no messages/ dir', () => {
    expect(() => writeModuleMessages(root, 'produtos', { title: 'Produtos' })).not.toThrow()
    expect(existsSync(join(root, 'messages'))).toBe(false)
  })
})

describe('hasI18n', () => {
  it('false when neither signal is present', () => {
    expect(hasI18n(root)).toBe(false)
  })

  it('true when src/i18n/request.ts exists', () => {
    mkdirSync(join(root, 'src', 'i18n'), { recursive: true })
    writeFileSync(join(root, 'src', 'i18n', 'request.ts'), '')
    expect(hasI18n(root)).toBe(true)
  })

  it('true when messages/pt-BR.json exists', () => {
    mkdirSync(join(root, 'messages'), { recursive: true })
    writeFileSync(join(root, 'messages', 'pt-BR.json'), '{}')
    expect(hasI18n(root)).toBe(true)
  })
})
