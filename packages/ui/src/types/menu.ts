import { LucideIcon } from 'lucide-react'
import { ComponentType, SVGProps } from 'react'
import type { I18nText } from '../i18n/msg'

export type MenuItemType = 'single' | 'group' | 'separator'
export type MenuVariant = 'primary' | 'secondary' | 'accent' | 'neutral'

// Icon can be either a Lucide icon or any custom SVG component
export type IconComponent = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>

export interface BaseMenuItem {
  id: string
  type: MenuItemType
  title?: I18nText
  description?: I18nText
  /** Icon as a Lucide/SVG component, or as a string key resolved via `getIcon()` */
  icon?: string | IconComponent
  variant?: MenuVariant
  priority?: number
  isDisabled?: boolean
  isNew?: boolean
  isBeta?: boolean
  isFavorite?: boolean
  badge?: string
  shortcut?: string
  /**
   * Permission(s) needed to see this item (any of them grants, like an action's
   * `permission`); without one the item is always visible. Applied by
   * `AdminShell`'s `can` prop or `filterMenuByPermission`. Hiding a menu entry
   * is not access control: the route itself must still check. Readonly so an
   * app can narrow it to its own permission union, `as const` arrays included.
   */
  permission?: string | readonly string[]
}

export interface SingleMenuItem extends BaseMenuItem {
  type: 'single'
  href: string
  title: I18nText
}

export interface GroupMenuItem extends BaseMenuItem {
  type: 'group'
  title: I18nText
  children: SingleMenuItem[]
  href?: string
  defaultExpanded?: boolean
}

export interface SeparatorMenuItem extends BaseMenuItem {
  type: 'separator'
}

export type MenuItem = SingleMenuItem | GroupMenuItem | SeparatorMenuItem

export interface BreadcrumbData {
  label: I18nText
  href: string
  icon?: IconComponent
}

export interface MenuConfig {
  items: MenuItem[]
  settings?: {
    expandedByDefault?: boolean
    showIcons?: boolean
    showBadges?: boolean
  }
}

export interface SystemMenu {
  config: MenuConfig
  activeItem?: string
  activeSection?: string
}
