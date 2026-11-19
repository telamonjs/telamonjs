'use client'

/* eslint-disable react-refresh/only-export-components -- utils file with
   incidental JSX (renderIcon); every export here is a helper function/const,
   not a React component, so fast-refresh boundaries don't apply */

import { type LucideIcon } from 'lucide-react'
import { type ComponentType, type ReactNode } from 'react'
import * as LucideIcons from 'lucide-react'
import {
  // Navigation & Layout
  Home,
  LayoutDashboard,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  X,

  // Users & Auth
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserCog,
  LogIn,
  LogOut,
  Lock,
  Unlock,
  Key,
  Shield,

  // Actions
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Copy,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  Eye,
  EyeOff,

  // Files & Documents
  File,
  FileText,
  Folder,
  FolderOpen,
  Image,
  FileImage,
  Paperclip,
  Archive,

  // Communication
  Mail,
  MessageSquare,
  MessageCircle,
  Bell,
  BellRing,
  Send,
  Phone,

  // Data & Charts
  BarChart,
  BarChart2,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,

  // Settings & Tools
  Settings,
  Cog,
  Wrench,
  Sliders,

  // Status & Feedback
  Check,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  XCircle,

  // Business
  Building,
  Building2,
  Briefcase,
  Calendar,
  CalendarDays,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  Tag,
  Tags,

  // Transport
  Car,
  Truck,
  MapPin,
  Map,
  Navigation,
  Compass,

  // Misc
  Star,
  Heart,
  Bookmark,
  Flag,
  Circle,
  Square,
  MoreHorizontal,
  MoreVertical,
  Grip,
  List,
  Grid,
  Table,
  Columns,
  Rows,
  Loader2,

  // Technology
  Database,
  Server,
  Cloud,
  Wifi,
  Globe,
  Link,
  ExternalLink,
  Code,
  Terminal,
  Cpu,

  // Social
  Share,
  Share2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'

// Additional icons only needed by the kebab-case name map below (CardLink /
// DataTableActions), not part of the curated PascalCase `iconMap`.
import {
  Trash,
  Pencil,
  Ticket,
  Gift,
  Utensils,
  Coffee,
  Sun,
  Moon,
} from 'lucide-react'

/**
 * Map of commonly used icons for administrative interfaces.
 *
 * This map provides a curated subset of Lucide icons that are frequently used
 * in admin panels and dashboards. Using this map instead of importing all
 * Lucide icons reduces bundle size by ~45KB per component.
 *
 * @example
 * ```tsx
 * import { getIcon } from '@/utils/icon'
 *
 * const Icon = getIcon('Home') // Returns Home component
 * const Icon2 = getIcon('Unknown') // Returns Circle (fallback)
 * ```
 */
export const iconMap: Record<string, LucideIcon> = {
  // Navigation & Layout
  Home,
  LayoutDashboard,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  X,

  // Users & Auth
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserCog,
  LogIn,
  LogOut,
  Lock,
  Unlock,
  Key,
  Shield,

  // Actions
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Copy,
  Download,
  Upload,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  Eye,
  EyeOff,

  // Files & Documents
  File,
  FileText,
  Folder,
  FolderOpen,
  Image,
  FileImage,
  Paperclip,
  Archive,

  // Communication
  Mail,
  MessageSquare,
  MessageCircle,
  Bell,
  BellRing,
  Send,
  Phone,

  // Data & Charts
  BarChart,
  BarChart2,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,

  // Settings & Tools
  Settings,
  Cog,
  Wrench,
  Sliders,

  // Status & Feedback
  Check,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  XCircle,

  // Business
  Building,
  Building2,
  Briefcase,
  Calendar,
  CalendarDays,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  ShoppingCart,
  Tag,
  Tags,

  // Transport
  Car,
  Truck,
  MapPin,
  Map,
  Navigation,
  Compass,

  // Misc
  Star,
  Heart,
  Bookmark,
  Flag,
  Circle,
  Square,
  MoreHorizontal,
  MoreVertical,
  Grip,
  List,
  Grid,
  Table,
  Columns,
  Rows,
  Loader2,

  // Technology
  Database,
  Server,
  Cloud,
  Wifi,
  Globe,
  Link,
  ExternalLink,
  Code,
  Terminal,
  Cpu,

  // Social
  Share,
  Share2,
  ThumbsUp,
  ThumbsDown,
}

/**
 * Project-level icon resolver. Maps an icon name to a component (or `null`/
 * `undefined` when the name is unknown, so resolution can fall back to the
 * lib's curated map).
 *
 * The return type is intentionally loose (`ComponentType<any>`): this is the seam
 * between the lib and the consumer's own icon library. In link mode the consumer's
 * `LucideIcon` is a different type instance than the lib's, so a stricter type
 * would reject the project's `iconRegistry` components — the resolver just hands
 * back whatever renderable icon component the project owns.
 */
export type IconResolver = (
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- link-mode cross-instance bridge (see doc comment above): the consumer's component type is not assignable to the lib's LucideIcon
) => ComponentType<any> | null | undefined

let externalResolver: IconResolver | null = null

/**
 * Register a consumer-owned icon resolver (e.g. the project's `iconRegistry`).
 *
 * Once set, {@link getIcon} consults this resolver FIRST when resolving a string
 * icon name, falling back to the lib's curated {@link iconMap} and then `Circle`.
 *
 * This is the recommended way to use string icons (`icon: 'ScrollText'`) for
 * names outside the lib's curated set: the project owns its registry without
 * bloating the lib, and passing icons by string avoids the lucide dual-instance
 * TypeScript error in link mode (the consumer's `LucideIcon` is a different type
 * instance than the lib's). Call it once at app startup.
 *
 * @example
 * ```tsx
 * // app boot (client), runs once
 * import { setIconResolver } from '@telamonjs/ui'
 * import { iconRegistry } from '@/lib/icons'
 *
 * setIconResolver((name) => iconRegistry[name])
 * ```
 *
 * Pass `null` to clear the resolver (e.g. in tests).
 */
export function setIconResolver(resolver: IconResolver | null): void {
  externalResolver = resolver
}

/**
 * Get an icon component by name.
 *
 * Resolution order: the registered {@link setIconResolver project resolver} (if
 * any) → the curated {@link iconMap} → `Circle` (fallback).
 *
 * @param name - Icon name (case-sensitive, must match the registry/Lucide export name)
 * @returns LucideIcon component
 *
 * @example
 * ```tsx
 * const HomeIcon = getIcon('Home')
 * const Unknown = getIcon('NonExistent') // Returns Circle
 * ```
 */
export function getIcon(name: string): LucideIcon {
  if (externalResolver) {
    const resolved = externalResolver(name)
    // Cross-instance bridge: the project's component is structurally a LucideIcon.
    if (resolved) return resolved as LucideIcon
  }
  return iconMap[name] || Circle
}

// Re-export Circle as the default fallback icon
export { Circle as FallbackIcon }

/**
 * Unified icon resolution system.
 * Accepts string icon names, LucideIcon components, or any React ComponentType.
 *
 * @category Utils
 */

/** Flexible icon type: string name, LucideIcon, or any React component */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any consumer component shape, same link-mode rationale as IconResolver above
export type IconInput = string | LucideIcon | ComponentType<any>

/**
 * Resolve an icon input to a renderable React component.
 * - If string: looks up in icon registry, returns fallback (Circle) if not found
 * - If component: returns as-is
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- return type mirrors IconInput's ComponentType<any>
export function resolveIcon(icon: IconInput): ComponentType<any> {
  if (typeof icon === 'string') {
    return getIcon(icon)
  }
  return icon
}

export type IconType = LucideIcon | ReactNode | string | null | undefined

/**
 * Unified icon rendering utility.
 *
 * Handles:
 * - Lucide icon components
 * - String icon names (resolves from lucide-react)
 * - React nodes
 * - null/undefined
 *
 * @param icon - Icon to render (LucideIcon | ReactNode | string | null)
 * @param className - CSS classes to apply
 * @param fallback - Fallback icon name (default: 'Circle')
 * @returns Rendered icon element or null
 *
 * @example
 * ```tsx
 * // Lucide component
 * renderIcon(User, 'h-4 w-4')
 *
 * // String name
 * renderIcon('User', 'h-4 w-4')
 *
 * // React node
 * renderIcon(<CustomIcon />, 'h-4 w-4')
 *
 * // With fallback
 * renderIcon(undefined, 'h-4 w-4', 'HelpCircle')
 * ```
 */
export function renderIcon(
  icon: IconType,
  className: string = 'h-4 w-4',
  fallback: string = 'Circle'
): ReactNode {
  const allIcons = LucideIcons as unknown as Record<string, LucideIcon>

  // Null check
  if (!icon) {
    if (fallback) {
      const FallbackIconComponent = allIcons[fallback] || LucideIcons.Circle
      return <FallbackIconComponent className={className} />
    }
    return null
  }

  // String icon name (resolve from lucide-react)
  if (typeof icon === 'string') {
    const ResolvedIcon =
      allIcons[icon] || allIcons[fallback] || LucideIcons.Circle
    return <ResolvedIcon className={className} />
  }

  // Function component (LucideIcon)
  if (typeof icon === 'function') {
    const IconComponent = icon as LucideIcon
    return <IconComponent className={className} />
  }

  // React element or object
  if (typeof icon === 'object') {
    // Check if it's a React element (already rendered)
    if ('$$typeof' in icon && !('render' in icon)) {
      return icon
    }

    // Check if it's a forward ref or component object with render method
    if ('$$typeof' in icon && 'render' in icon) {
      const IconComponent = icon as unknown as ComponentType<{
        className?: string
      }>
      return <IconComponent className={className} />
    }

    // Try to render as component
    const IconComponent = icon as unknown as ComponentType<{
      className?: string
    }>
    return <IconComponent className={className} />
  }

  // Fallback
  return <div className={className}>{icon}</div>
}

/**
 * Hook version for conditional icon rendering.
 *
 * @param icon - Icon to render
 * @param className - CSS classes to apply
 * @returns Function that renders the icon
 *
 * @example
 * ```tsx
 * const renderUserIcon = useIconRenderer(User, 'h-4 w-4')
 * return <div>{renderUserIcon()}</div>
 * ```
 */
export function useIconRenderer(icon: IconType, className?: string) {
  return () => renderIcon(icon, className)
}

/**
 * Kebab-case icon name -> Lucide component map, used by components that
 * accept icon names from Server Components (e.g. `CardLink`, `DataTableActions`).
 * Distinct key style from the curated {@link iconMap} above (PascalCase Lucide
 * export names) — kept separate to avoid ambiguous lookups between the two
 * registries.
 *
 * Usage:
 * - Server Component: <CardLink iconName="ticket" />
 * - Client Component: <CardLink icon={Ticket} />
 */
const kebabIconMap: Record<string, LucideIcon> = {
  // Actions
  activity: Activity,
  check: Check,
  'check-circle': CheckCircle,
  plus: Plus,
  edit: Edit,
  pencil: Pencil,
  trash: Trash,
  trash2: Trash2,
  download: Download,
  upload: Upload,
  search: Search,
  filter: Filter,
  x: X,
  'x-circle': XCircle,

  // Navigation
  home: Home,
  menu: Menu,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'more-vertical': MoreVertical,

  // UI Elements
  'alert-circle': AlertCircle,
  info: Info,
  bell: Bell,
  settings: Settings,
  eye: Eye,

  // Business Icons
  ticket: Ticket,
  'shopping-cart': ShoppingCart,
  'credit-card': CreditCard,
  'dollar-sign': DollarSign,
  gift: Gift,
  package: Package,
  archive: Archive,

  // People & Organization
  user: User,
  users: Users,
  shield: Shield,

  // Time & Calendar
  clock: Clock,
  calendar: Calendar,

  // Charts & Analytics
  'bar-chart': BarChart3,
  'trending-up': TrendingUp,

  // Food & Services
  utensils: Utensils,
  coffee: Coffee,

  // Documents
  'file-text': FileText,
  list: List,

  // Communication
  mail: Mail,

  // Theme
  sun: Sun,
  moon: Moon,
}

/**
 * Union type of all available kebab-case icon names.
 * Provides autocomplete and type safety when using iconName prop.
 */
export type IconName = keyof typeof kebabIconMap

/**
 * Get a Lucide icon component from its kebab-case string name.
 * Returns null if the icon name is not found.
 *
 * @param name - The icon name (e.g., 'ticket', 'users')
 * @returns The Lucide icon component or null
 *
 * @example
 * const Icon = getIconFromName('ticket')
 * if (Icon) return <Icon className="h-5 w-5" />
 */
export function getIconFromName(name: string): LucideIcon | null {
  return kebabIconMap[name] || null
}

/**
 * Resolve a CardLink-style icon prop (component, name, or unset) to a
 * renderable Lucide component, or null when the caller should fall back to
 * an element/string icon instead.
 */
export function resolveNamedIcon(
  icon: LucideIcon | ReactNode | string | undefined,
  iconName: string | undefined
): LucideIcon | null {
  if (icon && typeof icon === 'function') {
    return icon as LucideIcon
  }
  return iconName ? getIconFromName(iconName) : null
}
