import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { pickSectionValidation } from './form-validation'
import type { FormField } from '../types/forms/admin-form'

const field = (name: string): FormField => ({
  name,
  label: name,
  type: 'text',
})

describe('pickSectionValidation', () => {
  describe('Rendering (schema shape)', () => {
    it('picks only the fields present in a flat field list', () => {
      const schema = z.object({
        nome: z.string(),
        email: z.string().email(),
        idade: z.number(),
      })

      const result = pickSectionValidation(schema, [
        field('nome'),
        field('email'),
      ])

      expect(result).toBeDefined()
      const parsed = result!.safeParse({ nome: 'Ana', email: 'a@b.com' })
      expect(parsed.success).toBe(true)
      // 'idade' was not picked, so it's not part of the resulting shape
      expect(Object.keys((result as z.ZodObject<z.ZodRawShape>).shape)).toEqual(
        ['nome', 'email']
      )
    })

    it('picks fields from a row-based (nested array) field list', () => {
      const schema = z.object({ street: z.string(), city: z.string() })
      const result = pickSectionValidation(schema, [
        [field('street')],
        [field('city')],
      ])

      expect(Object.keys((result as z.ZodObject<z.ZodRawShape>).shape)).toEqual(
        ['street', 'city']
      )
    })
  })

  describe('Edge Cases', () => {
    it('ignores field names outside the schema shape (space/component fields) without crashing', () => {
      const schema = z.object({ nome: z.string() })
      const result = pickSectionValidation(schema, [
        field('nome'),
        { name: 'spacer', label: '', type: 'space' },
      ])

      expect(result).toBeDefined()
      expect(Object.keys((result as z.ZodObject<z.ZodRawShape>).shape)).toEqual(
        ['nome']
      )
    })

    it('returns undefined when validation is undefined', () => {
      expect(pickSectionValidation(undefined, [field('nome')])).toBeUndefined()
    })

    it('returns undefined for ZodEffects (refine/superRefine) schemas', () => {
      const schema = z
        .object({ password: z.string(), confirm: z.string() })
        .refine(data => data.password === data.confirm)

      expect(pickSectionValidation(schema, [field('password')])).toBeUndefined()
    })

    it('returns undefined when none of the section field names exist in the shape', () => {
      const schema = z.object({ nome: z.string() })
      expect(
        pickSectionValidation(schema, [field('outroCampo')])
      ).toBeUndefined()
    })

    it('picks a ZodObject from a foreign zod instance (link mode: duck-typed, not instanceof)', () => {
      // Simulates the consumer app and the lib each resolving their own copy
      // of the `zod` module in link mode: structurally a ZodObject (same
      // `_def.typeName`, `.shape`, `.pick`), but NOT `instanceof` the lib's
      // `z.ZodObject` because its prototype chain is a different one.
      const real = z.object({ nome: z.string(), email: z.string().email() })
      // `shape` is a getter on ZodObject.prototype (not an own property of
      // `real`), so a plain `Object.assign(target, real)` would NOT copy
      // it — read it explicitly so the foreign object is a faithful
      // structural clone.
      const foreign = Object.assign(Object.create(null), {
        _def: real._def,
        shape: real.shape,
        pick: real.pick.bind(real),
      }) as z.ZodType

      expect(foreign instanceof z.ZodObject).toBe(false)

      const result = pickSectionValidation(foreign, [field('nome')])

      expect(result).toBeDefined()
      expect(Object.keys((result as z.ZodObject<z.ZodRawShape>).shape)).toEqual(
        ['nome']
      )
    })
  })
})
