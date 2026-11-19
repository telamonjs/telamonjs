import React from 'react'
import type { useTelamonjsT } from '../../i18n/use-t'
import type { Locale } from 'date-fns'

export interface FieldRendererProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- merged RHF field + FormField metadata shape consumed generically by 12+ renderer implementations across 36 field types; narrowing needs a per-type discriminated union, out of scope for a lint pass.
  field: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- value shape varies per field type (string, number, Date, File, array...); consumers narrow per-renderer.
  value: any
  id?: string
  /**
   * i18n translator scoped to `telamonjs.*`. `render` is a plain function (not
   * a component/hook) called directly by callers — it cannot call
   * `useTelamonjsT()` itself, so the 3 real call sites
   * (AdminFormRenderer/BaseForm/ZustandForm's field renderer components)
   * provide it here. Tests calling `X.render({...})` outside a React tree
   * import the ready-made pt-BR translator from `src/test/i18n.ts`.
   */
  t: ReturnType<typeof useTelamonjsT>
  /** date-fns locale for calendar renderers (react-day-picker `locale` prop). */
  dateFnsLocale: Locale
}

// Base field renderer interface
export interface FieldRenderer {
  render: (props: FieldRendererProps) => React.ReactElement
}
