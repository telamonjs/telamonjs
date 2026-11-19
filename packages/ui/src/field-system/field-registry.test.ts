import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fieldRegistry,
  getFieldRenderer,
  registerFieldRenderer,
  getAvailableFieldTypes,
  FieldType,
} from './field-registry'
import {
  TextRenderer,
  EmailRenderer,
  PasswordRenderer,
  NumberRenderer,
  FloatRenderer,
  TextareaRenderer,
  BooleanRenderer,
  MaskedDateRenderer,
  MaskedDateTimeRenderer,
  RelationshipRenderer,
  MultiSelectRenderer,
  ImageRenderer,
  FileRenderer,
  SVGRenderer,
  MaskedRenderer,
  ComponentRenderer,
  SpaceRenderer,
  CrudRenderer,
} from './field-renderers'
import { logger } from '../utils/logger'

describe('Field Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fieldRegistry', () => {
    it('contains all expected field type mappings', () => {
      const expectedTypes: FieldType[] = [
        'text',
        'email',
        'password',
        'number',
        'float',
        'textarea',
        'boolean',
        'date',
        'datetime',
        'masked-datetime',
        'relationship',
        'multiselect',
        'image',
        'file',
        'svg',
        'masked',
        'component',
        'space',
        'crud',
        'string',
        'checkbox',
      ]

      expectedTypes.forEach(type => {
        expect(fieldRegistry[type]).toBeDefined()
        expect(fieldRegistry[type]).toHaveProperty('render')
        expect(typeof fieldRegistry[type].render).toBe('function')
      })
    })

    it('maps aliases correctly', () => {
      expect(fieldRegistry.string).toBe(TextRenderer)
      expect(fieldRegistry.checkbox).toBe(BooleanRenderer)
    })

    it('maps all renderers correctly', () => {
      expect(fieldRegistry.text).toBe(TextRenderer)
      expect(fieldRegistry.email).toBe(EmailRenderer)
      expect(fieldRegistry.password).toBe(PasswordRenderer)
      expect(fieldRegistry.number).toBe(NumberRenderer)
      expect(fieldRegistry.float).toBe(FloatRenderer)
      expect(fieldRegistry.textarea).toBe(TextareaRenderer)
      expect(fieldRegistry.boolean).toBe(BooleanRenderer)
      expect(fieldRegistry.date).toBe(MaskedDateRenderer)
      expect(fieldRegistry['masked-date']).toBe(MaskedDateRenderer)
      // datetime uses the hybrid (mask + calendar)
      expect(fieldRegistry.datetime).toBe(MaskedDateTimeRenderer)
      expect(fieldRegistry['masked-datetime']).toBe(MaskedDateTimeRenderer)
      expect(fieldRegistry.relationship).toBe(RelationshipRenderer)
      expect(fieldRegistry.multiselect).toBe(MultiSelectRenderer)
      expect(fieldRegistry.image).toBe(ImageRenderer)
      expect(fieldRegistry.file).toBe(FileRenderer)
      expect(fieldRegistry.svg).toBe(SVGRenderer)
      expect(fieldRegistry.masked).toBe(MaskedRenderer)
      expect(fieldRegistry.component).toBe(ComponentRenderer)
      expect(fieldRegistry.space).toBe(SpaceRenderer)
      expect(fieldRegistry.crud).toBe(CrudRenderer)
    })
  })

  describe('getFieldRenderer', () => {
    it('returns correct renderer for valid field types', () => {
      expect(getFieldRenderer('text')).toBe(TextRenderer)
      expect(getFieldRenderer('email')).toBe(EmailRenderer)
      expect(getFieldRenderer('boolean')).toBe(BooleanRenderer)
      expect(getFieldRenderer('date')).toBe(MaskedDateRenderer)
      expect(getFieldRenderer('multiselect')).toBe(MultiSelectRenderer)
    })

    it('returns TextRenderer as fallback for invalid field types', () => {
      const consoleWarnSpy = vi.spyOn(logger, 'warn')
        .mockImplementation(() => {})

      const renderer = getFieldRenderer('invalid-type' as FieldType)

      expect(renderer).toBe(TextRenderer)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No renderer found for field type: invalid-type. Using text renderer as fallback.'
      )

      consoleWarnSpy.mockRestore()
    })

    it('handles undefined field types gracefully', () => {
      const consoleWarnSpy = vi.spyOn(logger, 'warn')
        .mockImplementation(() => {})

      const renderer = getFieldRenderer(undefined as any)

      expect(renderer).toBe(TextRenderer)
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('handles null field types gracefully', () => {
      const consoleWarnSpy = vi.spyOn(logger, 'warn')
        .mockImplementation(() => {})

      const renderer = getFieldRenderer(null as any)

      expect(renderer).toBe(TextRenderer)
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('registerFieldRenderer', () => {
    it('allows registering new custom field renderers', () => {
      const customRenderer = {
        render: vi.fn(() => '<div>Custom Field</div>' as any),
      }

      registerFieldRenderer('custom', customRenderer)

      expect(fieldRegistry['custom' as FieldType]).toBe(customRenderer)
      expect(getFieldRenderer('custom' as FieldType)).toBe(customRenderer)
    })

    it('allows overriding existing field renderers', () => {
      const originalRenderer = fieldRegistry.text
      const newRenderer = {
        render: vi.fn(() => '<div>New Text Field</div>' as any),
      }

      registerFieldRenderer('text', newRenderer)

      expect(fieldRegistry.text).toBe(newRenderer)
      expect(getFieldRenderer('text')).toBe(newRenderer)

      // Restore original for other tests
      registerFieldRenderer('text', originalRenderer)
    })

    it('handles null renderer gracefully', () => {
      expect(() => {
        registerFieldRenderer('test', null as any)
      }).not.toThrow()

      expect(fieldRegistry['test' as FieldType]).toBeNull()
    })
  })

  describe('getAvailableFieldTypes', () => {
    it('returns all available field types', () => {
      const types = getAvailableFieldTypes()

      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)

      const expectedTypes = [
        'text',
        'email',
        'password',
        'number',
        'float',
        'textarea',
        'boolean',
        'date',
        'datetime',
        'masked-datetime',
        'relationship',
        'multiselect',
        'image',
        'file',
        'svg',
        'masked',
        'component',
        'space',
        'crud',
        'string',
        'checkbox',
      ]

      expectedTypes.forEach(type => {
        expect(types).toContain(type)
      })
    })

    it('returns types as strings', () => {
      const types = getAvailableFieldTypes()

      types.forEach(type => {
        expect(typeof type).toBe('string')
      })
    })

    it('includes custom registered types', () => {
      const customRenderer = {
        render: vi.fn(() => '<div>Custom</div>' as any),
      }

      registerFieldRenderer('custom-test', customRenderer)

      const types = getAvailableFieldTypes()
      expect(types).toContain('custom-test')

      // Clean up
      delete fieldRegistry['custom-test' as FieldType]
    })
  })

  describe('Field Registry Integration', () => {
    it('maintains registry integrity after operations', () => {
      const originalSize = Object.keys(fieldRegistry).length

      // Add a custom renderer
      const customRenderer = { render: vi.fn() }
      registerFieldRenderer('temp-custom', customRenderer)

      expect(Object.keys(fieldRegistry).length).toBe(originalSize + 1)

      // Verify it can be retrieved
      expect(getFieldRenderer('temp-custom' as FieldType)).toBe(customRenderer)

      // Clean up
      delete fieldRegistry['temp-custom' as FieldType]
      expect(Object.keys(fieldRegistry).length).toBe(originalSize)
    })

    it('preserves original renderers after custom additions', () => {
      const originalTextRenderer = fieldRegistry.text

      registerFieldRenderer('custom-field', { render: vi.fn() })

      expect(fieldRegistry.text).toBe(originalTextRenderer)
      expect(getFieldRenderer('text')).toBe(originalTextRenderer)

      // Clean up
      delete fieldRegistry['custom-field' as FieldType]
    })
  })

  describe('Type Safety', () => {
    it('maintains type safety with FieldType enum', () => {
      const validTypes: FieldType[] = [
        'text',
        'email',
        'password',
        'number',
        'float',
        'textarea',
        'boolean',
        'date',
        'datetime',
        'masked-datetime',
        'relationship',
        'multiselect',
        'image',
        'file',
        'svg',
        'masked',
        'component',
        'space',
        'crud',
        'string',
        'checkbox',
      ]

      validTypes.forEach(type => {
        expect(() => getFieldRenderer(type)).not.toThrow()
      })
    })

    it('all field types have consistent renderer interface', () => {
      const types = getAvailableFieldTypes()

      types.forEach(type => {
        const renderer = getFieldRenderer(type)
        expect(renderer).toHaveProperty('render')
        expect(typeof renderer.render).toBe('function')
      })
    })
  })
})
