import { logger } from '../utils/logger'
import { FieldRenderer } from './field-renderers'
import {
  TextRenderer,
  EmailRenderer,
  PasswordRenderer,
  NumberRenderer,
  FloatRenderer,
  CurrencyRenderer,
  TextareaRenderer,
  BooleanRenderer,
  MaskedDateTimeRenderer,
  MaskedDateRenderer,
  RelationshipRenderer,
  MultiSelectRenderer,
  ImageRenderer,
  FileRenderer,
  SVGRenderer,
  MaskedRenderer,
  ComponentRenderer,
  SpaceRenderer,
  CrudRenderer,
  HiddenRenderer,
  RichTextRenderer,
  DateRangeRenderer,
  TimeRenderer,
  FileUploadRenderer,
  WizardRenderer,
  // HTML5 Native Types
  URLRenderer,
  TelRenderer,
  ColorRenderer,
  RangeRenderer,
  MonthRenderer,
  WeekRenderer,
  SearchRenderer,
} from './field-renderers'

export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'float'
  | 'currency'
  | 'password'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'masked-date'
  | 'masked-datetime'
  | 'textarea'
  | 'svg'
  | 'relationship'
  | 'multiselect'
  | 'image'
  | 'file'
  | 'component'
  | 'space'
  | 'masked'
  | 'crud'
  | 'string'
  | 'checkbox'
  | 'hidden'
  | 'richtext'
  | 'daterange'
  | 'time'
  | 'fileupload'
  | 'wizard'
  // HTML5 Native Types
  | 'url'
  | 'tel'
  | 'color'
  | 'range'
  | 'month'
  | 'week'
  | 'search'

// Field registry for extensibility
export const fieldRegistry: Record<FieldType, FieldRenderer> = {
  text: TextRenderer,
  email: EmailRenderer,
  password: PasswordRenderer,
  number: NumberRenderer,
  float: FloatRenderer,
  currency: CurrencyRenderer,
  textarea: TextareaRenderer,
  boolean: BooleanRenderer,
  date: MaskedDateRenderer,
  // Hybrid (mask + calendar) — DateTimeRenderer/DateTimePicker remain
  // exported for direct use outside forms
  datetime: MaskedDateTimeRenderer,
  'masked-date': MaskedDateRenderer,
  'masked-datetime': MaskedDateTimeRenderer,
  relationship: RelationshipRenderer,
  multiselect: MultiSelectRenderer,
  image: ImageRenderer,
  file: FileRenderer,
  svg: SVGRenderer,
  masked: MaskedRenderer,
  component: ComponentRenderer,
  space: SpaceRenderer,
  crud: CrudRenderer,
  string: TextRenderer,
  checkbox: BooleanRenderer,
  hidden: HiddenRenderer,
  richtext: RichTextRenderer,
  daterange: DateRangeRenderer,
  time: TimeRenderer,
  fileupload: FileUploadRenderer,
  wizard: WizardRenderer,
  // HTML5 Native Types
  url: URLRenderer,
  tel: TelRenderer,
  color: ColorRenderer,
  range: RangeRenderer,
  month: MonthRenderer,
  week: WeekRenderer,
  search: SearchRenderer,
}

// Function to get renderer for field type
export function getFieldRenderer(fieldType: FieldType): FieldRenderer {
  const renderer = fieldRegistry[fieldType]
  if (!renderer) {
    logger.warn(
      `No renderer found for field type: ${fieldType}. Using text renderer as fallback.`
    )
    return TextRenderer
  }
  return renderer
}

// Function to register custom field renderer
export function registerFieldRenderer(
  fieldType: string,
  renderer: FieldRenderer
): void {
  fieldRegistry[fieldType as FieldType] = renderer
}

// Function to get all available field types
export function getAvailableFieldTypes(): FieldType[] {
  return Object.keys(fieldRegistry) as FieldType[]
}
