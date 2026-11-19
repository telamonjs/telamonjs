import { ViewMode } from './types'

/**
 * Maps the table density (ViewMode) to the Tailwind classes applied to body cells.
 *
 * - compact: 'py-1 text-xs'
 * - spacious: 'py-4 text-sm'
 * - comfortable (default): 'py-2 text-sm'
 *
 * @internal Extracted from DataTable.tsx (getDensityStyles)
 */
export function getDensityStyles(viewMode: ViewMode): string {
  switch (viewMode) {
    case 'compact':
      return 'py-1 text-xs'
    case 'spacious':
      return 'py-4 text-sm'
    default:
      return 'py-2 text-sm'
  }
}
