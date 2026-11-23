import { isValidElement, type ReactNode } from 'react'
import type { IconComponent } from '../../types/menu'

/** A `moduleIcons` entry: an emoji/text, a rendered node, or an icon component (e.g. Lucide). */
export type QueueModuleIcon = ReactNode | IconComponent

/** Renders a `moduleIcons` entry; components get the group-header icon size. */
export function ModuleIcon({ icon, className }: { icon: QueueModuleIcon; className?: string }) {
  // Lucide icons are forwardRef objects, so a component is either a function
  // or a `$$typeof` object that is not an element.
  const isComponent =
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon && !isValidElement(icon))
  if (isComponent) {
    const Icon = icon as IconComponent
    return <Icon className={className ?? 'h-4 w-4'} aria-hidden='true' />
  }
  return <>{icon as ReactNode}</>
}
