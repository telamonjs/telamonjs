import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { TelamonjsLocale } from './locales'
import { setupZodLocale } from './zod-locale'

const schema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().max(120),
  tags: z.array(z.string()).min(1),
  custom: z.string().min(1, { message: 'Custom wins' }),
})

const issues = (locale: TelamonjsLocale) => {
  setupZodLocale(locale)
  const r = schema.safeParse({
    name: 'ab',
    email: 'x',
    age: 130,
    tags: [],
    custom: '',
  })
  return Object.fromEntries(
    (r.success ? [] : r.error.issues).map(i => [i.path.join('.'), i.message])
  )
}

afterEach(() => setupZodLocale('pt-BR'))

describe('setupZodLocale', () => {
  it('translates common issues (pt-BR)', () => {
    expect(issues('pt-BR')).toEqual({
      name: 'Mínimo de 3 caracteres',
      email: 'E-mail inválido',
      age: 'Deve ser menor ou igual a 120',
      tags: 'Selecione ao menos 1 item',
      custom: 'Custom wins',
    })
  })

  it('translates common issues (en)', () => {
    expect(issues('en')).toMatchObject({
      name: 'At least 3 characters',
      email: 'Invalid email',
      tags: 'Select at least 1 item',
    })
  })

  it('reports required for undefined values', () => {
    setupZodLocale('es')
    const r = z.object({ a: z.string() }).safeParse({})
    expect(r.success ? '' : r.error.issues[0].message).toBe('Campo obligatorio')
  })
})

describe('custom issues with params.i18n', () => {
  it('translates refinements tagged with an i18n key', () => {
    setupZodLocale('en')
    const schema = z
      .string()
      .refine(() => false, { params: { i18n: 'invalidEmail' } })
    const r = schema.safeParse('x')
    expect(r.success ? '' : r.error.issues[0].message).toBe('Invalid email')
  })

  it('a key with a dot is absolute: resolved against the app messages passed to setupZodLocale', () => {
    setupZodLocale('en', {
      forms: { validation: { placa: 'Invalid plate {value}' } },
    })
    const schema = z
      .string()
      .refine(() => false, {
        params: { i18n: 'forms.validation.placa', values: { value: 'X' } },
      })
    const r = schema.safeParse('x')
    expect(r.success ? '' : r.error.issues[0].message).toBe('Invalid plate X')
  })

  it('absolute keys also reach library messages outside telamonjs.validation', () => {
    setupZodLocale('en')
    const schema = z
      .string()
      .refine(() => false, { params: { i18n: 'telamonjs.common.required' } })
    const r = schema.safeParse('x')
    expect(r.success ? '' : r.error.issues[0].message).toBe('required')
  })
})
