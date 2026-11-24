import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormStore, useForm, useForms } from './form-store'

const store = () => useFormStore.getState()
const required = (label: string) => `${label} is required`

const sections = [
  {
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'age', label: 'Age', required: true },
      { name: 'notes', label: 'Notes' },
    ],
  },
]

beforeEach(() => {
  useFormStore.setState({ forms: {}, formMeta: {} })
})

describe('form-store', () => {
  describe('State Management', () => {
    it('setFormData replaces the data and clears errors and touched fields', () => {
      store().setError('f', 'name', 'bad')
      store().setTouched('f', 'name', true)
      store().setFormData('f', { name: 'Ana' })

      expect(store().getFormData('f')).toEqual({ name: 'Ana' })
      expect(store().formMeta['f']).toMatchObject({
        errors: {},
        touched: {},
        isValid: true,
        isSubmitting: false,
      })
    })

    // Regression: loading the record marked the form dirty, so an edit form
    // was "dirty" before any keystroke and isDirty/anyDirty meant nothing.
    it('setFormData is a load: the form is pristine until a field is edited', () => {
      store().setFormData('f', { name: 'Ana' })
      expect(store().isFormDirty('f')).toBe(false)

      store().updateField('f', 'name', 'Bia')
      expect(store().isFormDirty('f')).toBe(true)

      // Loading again (a reset) makes it pristine again
      store().setFormData('f', { name: 'Carla' })
      expect(store().isFormDirty('f')).toBe(false)
    })

    it('updateField merges one field and marks it touched and the form dirty', () => {
      store().setFormData('f', { name: 'Ana', age: 30 })
      store().updateField('f', 'name', 'Bia')

      expect(store().getFormData('f')).toEqual({ name: 'Bia', age: 30 })
      expect(store().formMeta['f'].touched).toEqual({ name: true })
      expect(store().isFormDirty('f')).toBe(true)
    })

    it('updateField works on a form that was never initialised', () => {
      store().updateField('f', 'name', 'Ana')

      expect(store().getFieldValue('f', 'name')).toBe('Ana')
      expect(store().isFormValid('f')).toBe(true)
    })

    it('setError invalidates the form; clearErrors restores it', () => {
      store().setError('f', 'name', 'Taken')
      store().setError('f', 'age', 'Too young')

      expect(store().getFieldError('f', 'name')).toBe('Taken')
      expect(store().isFormValid('f')).toBe(false)

      store().clearErrors('f')
      expect(store().getFieldError('f', 'name')).toBeUndefined()
      expect(store().isFormValid('f')).toBe(true)
    })

    it('setSubmitting and setTouched update only their own flag', () => {
      store().setFormData('f', { name: 'Ana' })
      store().setSubmitting('f', true)
      store().setTouched('f', 'name', true)
      store().setTouched('f', 'age', false)

      expect(store().formMeta['f']).toMatchObject({
        isSubmitting: true,
        touched: { name: true, age: false },
      })
      expect(store().getFormData('f')).toEqual({ name: 'Ana' })
    })

    it('resetForm removes data and meta, so reads fall back to defaults', () => {
      store().setFormData('f', { name: 'Ana' })
      store().setError('f', 'name', 'bad')
      store().setFormData('other', { x: 1 })
      store().resetForm('f')

      expect(store().getFormData('f')).toEqual({})
      expect(store().isFormValid('f')).toBe(true)
      expect(store().isFormDirty('f')).toBe(false)
      expect(store().getFormData('other')).toEqual({ x: 1 })
    })
  })

  describe('validateForm', () => {
    it('flags every missing required field with the given message', () => {
      store().setFormData('f', { notes: 'x' })

      expect(store().validateForm('f', sections, required)).toBe(false)
      expect(store().formMeta['f'].errors).toEqual({
        name: 'Name is required',
        age: 'Age is required',
      })
      expect(store().isFormValid('f')).toBe(false)
    })

    it('passes when the required fields are filled and drops stale errors', () => {
      store().setFormData('f', { name: 'Ana', age: 30 })
      store().setError('f', 'name', 'stale')

      expect(store().validateForm('f', sections, required)).toBe(true)
      expect(store().formMeta['f'].errors).toEqual({})
      expect(store().isFormValid('f')).toBe(true)
    })

    // Regression: `!value` treated a numeric 0 as missing, so a required
    // quantity/price of 0 could never be submitted through ZustandForm.
    it('accepts 0 as a value for a required field', () => {
      store().setFormData('f', { name: 'Ana', age: 0 })

      expect(store().validateForm('f', sections, required)).toBe(true)
    })

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['an empty string', ''],
      ['false', false],
      ['an empty array', []],
    ])('treats %s as missing', (_label, value) => {
      store().setFormData('f', { name: 'Ana', age: value })

      expect(store().validateForm('f', sections, required)).toBe(false)
      expect(store().getFieldError('f', 'age')).toBe('Age is required')
    })

    it('validates a form with no data and tolerates sections without fields', () => {
      expect(
        store().validateForm('f', [{ label: 'Empty' } as never, ...sections], required)
      ).toBe(false)
      expect(Object.keys(store().formMeta['f'].errors)).toEqual(['name', 'age'])
    })
  })

  describe('useForm', () => {
    it('initialises the store once from initialData', () => {
      const { result, rerender } = renderHook(
        ({ data }) => useForm('f', data),
        { initialProps: { data: { name: 'Ana' } as Record<string, unknown> } }
      )
      expect(result.current.data).toEqual({ name: 'Ana' })
      expect(result.current.isDirty).toBe(false)

      act(() => result.current.updateField('name', 'Bia'))
      // A new initialData identity must not wipe the in-progress edit
      rerender({ data: { name: 'Ana' } })

      expect(result.current.data).toEqual({ name: 'Bia' })
      expect(result.current.getFieldValue('name')).toBe('Bia')
    })

    it('re-initialises on remount (the ListPage key strategy)', () => {
      const first = renderHook(() => useForm('f', { name: 'Ana' }))
      first.unmount()

      const { result } = renderHook(() => useForm('f', { name: 'Carla' }))
      expect(result.current.data).toEqual({ name: 'Carla' })
    })

    it('does not initialise from empty initialData', () => {
      const { result } = renderHook(() => useForm('f', {}))

      expect(result.current.data).toEqual({})
      expect(result.current.isDirty).toBe(false)
      expect(result.current.meta).toEqual({
        isSubmitting: false,
        isDirty: false,
        errors: {},
        touched: {},
        isValid: true,
      })
    })

    it('validate uses the translated required message', () => {
      const { result } = renderHook(() => useForm('f', { notes: 'x' }))

      let valid = true
      act(() => {
        valid = result.current.validate(sections)
      })

      expect(valid).toBe(false)
      expect(result.current.getFieldError('name')).toBe('Name é obrigatório')
      expect(result.current.isValid).toBe(false)
    })

    it('shouldShowError only once the field is touched and has an error', () => {
      const { result } = renderHook(() => useForm('f', { name: '' }))

      act(() => result.current.setError('name', 'Required'))
      expect(result.current.hasError('name')).toBe(true)
      expect(result.current.isTouched('name')).toBe(false)
      expect(result.current.shouldShowError('name')).toBeFalsy()

      act(() => result.current.setTouched('name', true))
      expect(result.current.shouldShowError('name')).toBe(true)

      act(() => result.current.clearErrors())
      expect(result.current.shouldShowError('name')).toBe(false)
    })

    it('bound actions target their own form id', () => {
      const { result } = renderHook(() => useForm('f', { name: 'Ana' }))
      store().setFormData('g', { name: 'Gil' })

      act(() => {
        result.current.setSubmitting(true)
        result.current.reset()
      })

      expect(store().getFormData('f')).toEqual({})
      expect(store().getFormData('g')).toEqual({ name: 'Gil' })
    })
  })

  describe('useForms', () => {
    it('aggregates validity and dirtiness across forms', () => {
      const { result } = renderHook(() => useForms(['a', 'b']))
      expect(result.current.allValid).toBe(true)
      expect(result.current.anyDirty).toBe(false)

      act(() => {
        store().updateField('b', 'x', 1)
        store().setError('a', 'x', 'bad')
      })

      expect(result.current.allValid).toBe(false)
      expect(result.current.anyDirty).toBe(true)
      expect(result.current.getForm('b')).toMatchObject({ data: { x: 1 } })
    })

    // Regression: `every` stopped at the first invalid form, so the errors of
    // the later wizard steps were never computed.
    it('validateAll validates every form, not just up to the first invalid one', () => {
      const { result } = renderHook(() => useForms(['a', 'b']))

      let valid = true
      act(() => {
        valid = result.current.validateAll({ a: sections, b: sections })
      })

      expect(valid).toBe(false)
      expect(store().getFieldError('a', 'name')).toBe('Name é obrigatório')
      expect(store().getFieldError('b', 'name')).toBe('Name é obrigatório')
    })

    it('validateAll treats a form without sections as valid', () => {
      const { result } = renderHook(() => useForms(['a']))
      expect(result.current.validateAll({})).toBe(true)
    })

    it('resetAll clears every listed form', () => {
      store().setFormData('a', { x: 1 })
      store().setFormData('b', { y: 2 })
      store().setFormData('c', { z: 3 })
      const { result } = renderHook(() => useForms(['a', 'b']))

      act(() => result.current.resetAll())

      expect(store().forms).toEqual({ c: { z: 3 } })
    })
  })
})
