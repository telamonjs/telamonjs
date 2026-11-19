/**
 * Utils - Barrel export for all utility functions
 *
 * @module utils
 */

// CN Utility
export { cn } from './cn'

// HTML sanitization (XSS boundary for dangerouslySetInnerHTML / rich text)
export { sanitizeSvg, sanitizeRichText } from './sanitize-html'

// Menu Helpers
export {
  filterMenuByRole,
  findMenuItemById,
  findMenuItemByHref,
  getBreadcrumbPath,
  sortMenuByPriority,
  getAllSingleItems,
  isMenuItemActive,
  getActiveSectionFromPath,
  countMenuItems,
  validateMenuConfig,
} from './menu-helpers'

// Form Data Converters
export { hasNestedStructure } from './form-data-converter'

// Spacing utilities
export {
  DENSITY_SPACING,
  GAP_SIZES,
  DIALOG_SIZES,
  CARD_FIELD_LAYOUTS,
  computeAutoDialogSize,
  resolveDialogSize,
} from './spacing'
export type {
  Density,
  GapSize,
  DialogSize,
  DialogHeight,
  DensitySpacing,
  FieldLayout,
  CardFieldLayout,
} from './spacing'
