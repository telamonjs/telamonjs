/**
 * @telamonjs/ui/menu
 *
 * Menu types and pure helpers, with no React or Next.js import: usable from
 * plain modules (a menu config in `src/lib`, its unit tests) where importing
 * the root barrel would pull in `next/navigation`.
 */

export { filterMenuByPermission } from '../utils/menu-helpers'
export type {
  MenuItem,
  MenuItemType,
  MenuVariant,
  BaseMenuItem,
  SingleMenuItem,
  GroupMenuItem,
  SeparatorMenuItem,
  MenuConfig,
  BreadcrumbData,
  IconComponent,
} from '../types/menu'
