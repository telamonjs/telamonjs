/**
 * Icon Registry — the app owns its icon set.
 *
 * Only the icons this app actually uses are imported (tree-shaking). Menu
 * items, `headerConfig.icon` and `TabItem.icon` reference icons by STRING;
 * `app-providers.tsx` registers this map once via `setIconResolver`, so the
 * library resolves those strings here first and falls back to its own
 * curated set (then `Circle`).
 *
 * IMPORTANT: when a new icon name is used anywhere, add it here — a missing
 * name silently renders as a circle, never throws.
 */
import {
  Activity,
  Calendar,
  Circle,
  Eye,
  History,
  Info,
  KeyRound,
  LayoutDashboard,
  Mail,
  Pencil,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserX,
  Users,
  type LucideIcon,
} from 'lucide-react'

export const iconRegistry: Record<string, LucideIcon> = {
  Activity,
  Calendar,
  Circle,
  Eye,
  History,
  Info,
  KeyRound,
  LayoutDashboard,
  Mail,
  Pencil,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserX,
  Users,
}

/** Icon by name from this app's registry; `Circle` when the name is unknown. */
export function getIcon(name: string): LucideIcon {
  return iconRegistry[name] ?? Circle
}

export type IconName = keyof typeof iconRegistry
export type { LucideIcon }
