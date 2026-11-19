// ============================================================================
// FORM SYSTEM
// ============================================================================
// AdminForm (Core Form System) - Primary Form export
export {
  AdminForm,
  AdminForm as Form,
  CreateForm,
  EditForm,
  BaseForm,
} from '../components/forms'
export type {
  BaseFormProps,
  BaseFormActionsConfig,
  BaseFormActionConfig,
  BaseFormCustomAction,
  FormMetadata,
} from '../components/forms'

// Form types
export type {
  FormField as AdminFormField,
  FormSection,
  FormActionResult,
  AdminFormProps,
  IOption,
  CrudListingFn,
  CrudCreateFn,
  CrudEditFn,
  CrudDeleteFn,
  CrudLoadFn,
} from '../types/forms/admin-form'

// Form components
export { AdminFormRenderer } from '../components/forms/AdminFormRenderer'
export type { AdminFormRendererProps } from '../components/forms/AdminFormRenderer'

export { FileUpload } from '../components/forms/FileUpload'
export type { FileUploadProps } from '../components/forms/FileUpload'
export { DateRangePicker } from '../components/forms/DateRangePicker'
export type {
  DateRangePickerProps,
  DateRange,
  DateRangePreset,
} from '../components/forms/DateRangePicker'

export { Stepper } from '../components/forms/Stepper'
export type { StepperProps, StepConfig } from '../components/forms/Stepper'

export { useFormDraft } from '../hooks/useFormDraft'

// Validation Engine
// BR Validators - Functions
export {
  validateCPF,
  validateCNPJ,
  validateCEP,
  validateTelefone,
  validatePlaca,
  validateRENAVAM,
} from '../components/forms/validators/br-validators'
// BR Validators - Zod validators
export {
  cpf,
  cnpj,
  cep,
  telefone,
  placa,
  renavam,
} from '../components/forms/validators/br-validators'

// Async Validators - Types
export type { AsyncCheckFn } from '../components/forms/validators/async-validators'
// Async Validators - Functions
export {
  uniqueCPF,
  uniqueCNPJ,
} from '../components/forms/validators/async-validators'

// Zustand Forms (State-managed forms)
export { ZustandForm, ZustandFormServer } from '../components/forms'

// Form UI Components
export {
  Form as UIForm,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../ui/form'
export { MultiSelect } from '../components/selectors/MultiSelect'
export { Combobox } from '../components/selectors/combobox'
export type { IOption as ComboboxOption } from '../components/selectors/combobox'

// Dynamic Components (lazy-loaded)
// NOTE: DynamicDateTimePicker (alias) lives in deprecated-aliases.ts

export { DynamicCodeEditor } from '../components/utilities/DynamicCodeEditor'

// Layout Utilities
export { Flex, FlexCol } from '../layouts/Flex'

// ============================================================================
// VALIDATION COMPONENTS
// ============================================================================

// Forms: WeekDaysSelector
export { WeekDaysSelector } from '../components/forms/WeekDaysSelector'
export type {
  WeekDaysSelectorProps,
  WeekDayLabel,
  WeekDaysLabels,
} from '../components/forms/WeekDaysSelector'

// Form state hooks from the SAME react-hook-form the forms use: a
// custom field (`type: 'component'`) that reads other fields must import these
// from telamonjs-ui — the app's own react-hook-form copy has no FormProvider
// context (null `_getWatch`) whenever two copies are installed (link mode).
export { useWatch, useFormContext } from 'react-hook-form'
