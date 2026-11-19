'use client'

/**
 * Field Renderers - Re-export barrel file
 *
 * All renderers have been split into individual files under ./renderers/
 * This file maintains backward compatibility by re-exporting everything.
 *
 * Structure:
 * - renderers/types.ts          - FieldRenderer, FieldRendererProps interfaces
 * - renderers/input-factory.ts  - createInputRenderer factory for simple Input-based renderers
 * - renderers/text-renderers.ts - Text, Email, Password, URL, Tel, Month, Week, Search, String
 * - renderers/number-renderers.ts    - Number, Float
 * - renderers/textarea-renderers.tsx - Textarea, SVG
 * - renderers/boolean-renderers.tsx  - Boolean (Switch), Checkbox
 * - renderers/date-renderers.tsx     - Date, DateTime, MaskedDateTime
 * - renderers/select-renderers.tsx   - Relationship (Combobox), MultiSelect
 * - renderers/file-renderers.tsx     - Image, File, FileUpload
 * - renderers/advanced-renderers.tsx - RichText, DateRange, Time, Wizard, Color, Range, Masked
 * - renderers/special-renderers.tsx  - Component, Space, Hidden, Crud
 * - renderers/index.ts              - Re-exports everything
 */

// Types
export type { FieldRenderer, FieldRendererProps } from './renderers'

// Factory
// eslint-disable-next-line react-refresh/only-export-components -- barrel de compatibilidade retroativa (ver header do arquivo); mistura deliberada de factory + renderers.
export { createInputRenderer } from './renderers'
export type { InputRendererOptions } from './renderers'

// Text-based renderers
export {
  TextRenderer,
  EmailRenderer,
  PasswordRenderer,
  URLRenderer,
  TelRenderer,
  MonthRenderer,
  WeekRenderer,
  SearchRenderer,
} from './renderers'

// Number renderers
export { NumberRenderer, FloatRenderer, CurrencyRenderer } from './renderers'

// Textarea renderers
export { TextareaRenderer, SVGRenderer } from './renderers'

// Boolean renderers
export { BooleanRenderer } from './renderers'

// Date renderers
export {
  DateRenderer,
  DateTimeRenderer,
  MaskedDateTimeRenderer,
  MaskedDateRenderer,
} from './renderers'

// Select renderers
export { RelationshipRenderer, MultiSelectRenderer } from './renderers'

// File renderers
export { ImageRenderer, FileRenderer, FileUploadRenderer } from './renderers'

// Advanced renderers
export {
  RichTextRenderer,
  DateRangeRenderer,
  TimeRenderer,
  WizardRenderer,
  ColorRenderer,
  RangeRenderer,
  MaskedRenderer,
} from './renderers'

// Special renderers
export {
  ComponentRenderer,
  SpaceRenderer,
  HiddenRenderer,
  CrudRenderer,
} from './renderers'
