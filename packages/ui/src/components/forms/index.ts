'use client'

// Form Components Barrel Export

// BaseForm - Foundation component with state observation
export { BaseForm } from './BaseForm'
export type {
  BaseFormProps,
  BaseFormActionsConfig,
  BaseFormActionConfig,
  BaseFormCustomAction,
  FormMetadata,
  ConfirmDialogConfig,
  ButtonVariant,
} from '../../types/forms/base-form'

// Shared form types (from admin-form.ts)
export type {
  FormField,
  FormSection,
  IOption,
} from '../../types/forms/admin-form'

// AdminForm - Server Actions wrapper
export { AdminForm } from './AdminForm'
export { AdminForm as Form } from './AdminForm' // Alias for backward compatibility
export { CreateForm } from './CreateForm'
export { EditForm } from './EditForm'
export { ZustandForm } from './ZustandForm'
export { ZustandFormServer } from './ZustandFormServer'

// WeekDaysSelector
export { WeekDaysSelector } from './WeekDaysSelector'
export type { WeekDaysSelectorProps, WeekDayLabel, WeekDaysLabels } from './WeekDaysSelector'
