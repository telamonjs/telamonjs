/**
 * Spacing utilities for density control
 *
 * @module utils/spacing
 *
 * @description
 * Provides consistent spacing configurations for compact, comfortable, and spacious layouts.
 * Used across Detail components (DetailField, DetailCard, DetailLayout) and Dialogs.
 */

import { cn } from './cn'

/**
 * Density type for controlling spacing across components
 *
 * - `compact`: Minimal spacing for dense information display (dialogs, tables)
 * - `comfortable`: Default balanced spacing for most use cases
 * - `spacious`: Extra padding for emphasis and readability
 */
export type Density = 'compact' | 'comfortable' | 'spacious'

/**
 * Gap size type for controlling grid gaps
 */
export type GapSize = 'sm' | 'md' | 'lg'

/**
 * Dialog size presets
 *
 * - `auto`: Computes ideal size from form sections/fields count
 */
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'auto'

/**
 * Spacing configuration per density level
 */
export interface DensitySpacing {
  /** Gap between items (Tailwind class) */
  gap: string
  /** Vertical spacing between sections (Tailwind class) */
  spaceY: string
  /** Padding values (Tailwind class) */
  padding: string
  /** Icon size (Tailwind class) */
  iconSize: string
}

/**
 * Density spacing mappings
 *
 * @example
 * ```tsx
 * import { DENSITY_SPACING } from '@telamonjs/ui'
 *
 * const spacing = DENSITY_SPACING['compact']
 * // spacing.gap = 'gap-1'
 * // spacing.spaceY = 'space-y-1'
 * ```
 */
export const DENSITY_SPACING: Record<Density, DensitySpacing> = {
  compact: {
    gap: 'gap-1',
    spaceY: 'space-y-1',
    padding: 'py-2',
    iconSize: 'h-3.5 w-3.5',
  },
  comfortable: {
    gap: 'gap-3',
    spaceY: 'space-y-3',
    padding: 'py-4',
    iconSize: 'h-4 w-4',
  },
  spacious: {
    gap: 'gap-4',
    spaceY: 'space-y-4',
    padding: 'py-6',
    iconSize: 'h-5 w-5',
  },
}

/**
 * Gap size mappings for grids
 *
 * @example
 * ```tsx
 * import { GAP_SIZES } from '@telamonjs/ui'
 *
 * const gapClass = GAP_SIZES['sm'] // 'gap-2'
 * ```
 */
export const GAP_SIZES: Record<GapSize, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
}

/**
 * Dialog size mappings
 *
 * @example
 * ```tsx
 * import { DIALOG_SIZES } from '@telamonjs/ui'
 *
 * const widthClass = DIALOG_SIZES['lg'] // 'max-w-4xl'
 * ```
 */
export const DIALOG_SIZES: Record<Exclude<DialogSize, 'auto'>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
}

/**
 * Compute ideal dialog size from form sections.
 *
 * Heuristic:
 * - totalFields ≤ 4 AND ≤ 1 section → 'md' (~672px)
 * - totalFields ≤ 10 AND ≤ 3 sections → 'lg' (~896px)
 * - Otherwise → 'xl' (~1152px)
 *
 */
export function computeAutoDialogSize(
  sections: { fields: unknown[] | unknown[][] }[]
): Exclude<DialogSize, 'auto'> {
  const totalFields = countSectionFields(sections)

  if (totalFields <= 4 && sections.length <= 1) return 'md'
  if (totalFields <= 10 && sections.length <= 3) return 'lg'
  return 'xl'
}

/** Total fields of the sections (flat or row-based). */
export function countSectionFields(
  sections: { fields: unknown[] | unknown[][] }[]
): number {
  return sections.reduce(
    (sum, s) =>
      sum +
      (Array.isArray(s.fields[0])
        ? (s.fields as unknown[][]).flat().length
        : s.fields.length),
    0
  )
}

/** Up to this many fields a multi-section form is one page (no tabs). */
export const AUTO_TABS_MAX_FIELDS = 20

/**
 * Tabs for a create/edit form: explicit `useTabs` wins; otherwise only when it
 * pays off — more than one section AND more than {@link AUTO_TABS_MAX_FIELDS}
 * fields. Short forms split in tabs hid most of the form behind "Next" (and a
 * fixed-height dialog with empty space)
 */
export function resolveUseTabs(
  useTabs: boolean | undefined,
  sections: { fields: unknown[] | unknown[][] }[]
): boolean {
  if (sections.length <= 1) return false
  return useTabs ?? countSectionFields(sections) > AUTO_TABS_MAX_FIELDS
}

/**
 * One-page form in a wide dialog (xl/full): sections without an explicit
 * `grid` get 3 columns instead of 2 — 2 columns in ~1150px left half-empty
 * rows and a scroll for a form that fits
 */
export function withWideFormGrid<S extends { grid?: string }>(
  sections: readonly S[],
  { useTabs, size }: { useTabs: boolean; size: Exclude<DialogSize, 'auto'> }
): S[] {
  if (useTabs || (size !== 'xl' && size !== 'full')) return sections as S[]
  return sections.map(s => (s.grid ? s : { ...s, grid: '3' }))
}

/**
 * Resolve a DialogSize — if 'auto', compute from sections.
 */
export function resolveDialogSize(
  size: DialogSize,
  sections?: { fields: unknown[] | unknown[][] }[]
): Exclude<DialogSize, 'auto'> {
  if (size !== 'auto') return size
  if (!sections || sections.length === 0) return 'lg'
  return computeAutoDialogSize(sections)
}

/**
 * Field layout options
 */
export type FieldLayout = 'stacked' | 'horizontal'

/**
 * Card field layout options for grid configurations
 */
export type CardFieldLayout = 'single' | '2-col' | '3-col'

/**
 * Card field layout mappings
 */
export const CARD_FIELD_LAYOUTS: Record<CardFieldLayout, string> = {
  single: 'grid-cols-1',
  '2-col': 'grid-cols-1 md:grid-cols-2',
  '3-col': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}

/**
 * Dialog height preset.
 * - 'auto' (default): content-sized, capped at `max-h-[90vh]`
 * - 'full': fixed `h-[min(800px,85vh)]` on desktop, the body scrolls inside
 *
 * The mobile Sheet keeps its own height in both cases.
 *
 */
export type DialogHeight = 'auto' | 'full'

/**
 * Compute dialog className from size, custom className, height and header mode.
 *
 * Consolidates the duplicated sizing logic from CreateDialog, EditDialog, and ViewDialog.
 * `dialogClassName` is merged OVER the size preset (the app class
 * wins conflicts such as `max-w-*`) instead of replacing it.
 *
 */
export function getDialogClassName(options: {
  size?: DialogSize
  height?: DialogHeight
  dialogClassName?: string
  hasCustomHeader: boolean
  hasMultipleSections?: boolean
  sections?: { fields: unknown[] | unknown[][] }[]
}): { sizeClass: string; heightClass: string; finalClassName: string } {
  const {
    size = 'auto',
    height = 'auto',
    dialogClassName,
    hasCustomHeader,
    hasMultipleSections = false,
    sections,
  } = options
  const resolvedSize = resolveDialogSize(size, sections)
  const sizeClass = cn('w-[90vw]', DIALOG_SIZES[resolvedSize], dialogClassName)

  const heightClass =
    height === 'full' || (hasCustomHeader && hasMultipleSections)
      ? 'h-[min(800px,85vh)]'
      : 'max-h-[90vh]'

  const finalClassName = cn(
    'flex flex-col',
    hasCustomHeader ? '!p-0 !gap-0 overflow-hidden' : 'px-6 pb-0',
    heightClass,
    sizeClass
  )

  return { sizeClass, heightClass, finalClassName }
}

// Width/height utilities (any variant prefix) — meaningless on a bottom Sheet.
const SHEET_DROP = /(^|:)!?-?(?:min-|max-)?[wh]-/

/**
 * Derive the mobile Sheet className from a dialog `dialogClassName`: the same
 * classes minus width/height utilities (`w-`, `max-w-`, `min-h-`, `h-`, ...),
 * which only make sense for the desktop Dialog.
 *
 */
export function getSheetClassName(dialogClassName?: string): string {
  return (dialogClassName ?? '')
    .split(/\s+/)
    .filter(token => token && !SHEET_DROP.test(token))
    .join(' ')
}
