import { describe, it, expect } from 'vitest'
import { createTranslator } from 'next-intl'
import { activeFilter } from './active-filter'
import { isMessageRef, type I18nText } from '../i18n/msg'
import { telamonjsMessages } from '../i18n/messages'
import { toolbarQueryFilters } from '../pages/list-page/useListPageToolbar'

const resolve = (locale: 'pt-BR' | 'en' | 'es', text: I18nText) => {
  const t = createTranslator({ locale, messages: telamonjsMessages[locale] })
  return isMessageRef(text) ? t(text.key as never) : text
}

describe('activeFilter', () => {
  it('builds an All / Active / Inactive filter on `active` by default', () => {
    const f = activeFilter()
    expect(f.key).toBe('active')
    expect(f.allValue).toBe('all')
    expect(f.options.map(o => o.value)).toEqual(['all', 'true', 'false'])
    expect(f.defaultValue).toBeUndefined()
  })

  it('labels come from the library messages in every locale', () => {
    const f = activeFilter()
    expect([f.label, ...f.options.map(o => o.label)].map(l => resolve('en', l))).toEqual([
      'Status',
      'All',
      'Active',
      'Inactive',
    ])
    expect(f.options.map(o => resolve('pt-BR', o.label))).toEqual(['Todos', 'Ativos', 'Inativos'])
    expect(f.options.map(o => resolve('es', o.label))).toEqual(['Todos', 'Activos', 'Inactivos'])
  })

  it('takes another key and overrides (label, default, display mode)', () => {
    const f = activeFilter('ativo', { label: 'Situação', defaultValue: 'true', displayMode: 'select' })
    expect(f).toMatchObject({ key: 'ativo', label: 'Situação', defaultValue: 'true', displayMode: 'select' })
    expect(f.allValue).toBe('all')
  })

  it("'all' drops out of the query; 'true'/'false' reach the server as-is", () => {
    const f = activeFilter('ativo')
    expect(toolbarQueryFilters({ ativo: 'all' }, [f])).toEqual({})
    expect(toolbarQueryFilters({ ativo: 'true' }, [f])).toEqual({ ativo: 'true' })
    expect(toolbarQueryFilters({ ativo: 'false' }, [f])).toEqual({ ativo: 'false' })
  })
})
