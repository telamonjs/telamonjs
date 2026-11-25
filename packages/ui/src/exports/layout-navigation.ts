// ============================================================================
// NAVIGATION (real component, ui/breadcrumb primitives live in ui-primitives.ts)
// ============================================================================
export { ResponsiveBreadcrumb } from '../navigation/Breadcrumb'
export type {
  BreadcrumbSegmentOverride,
  BreadcrumbCustomSegments,
} from '../navigation/Breadcrumb'

// ============================================================================
// LAYOUT TEMPLATES
// ============================================================================
// Modern App Shell
export { AppShell } from '../layouts'
export type { AppShellProps } from '../layouts'

// Canonical Admin Shell — replaces hand-rolled AdminLayout boilerplate in consumer apps
export { AdminShell } from '../layouts'
export type { AdminShellProps, AdminShellBreadcrumbProps } from '../layouts'
// Light/dark switch (next-themes) — AdminShell `themeToggle` or standalone
export { ThemeToggle } from '../layouts'
export type { ThemeToggleProps } from '../layouts'
// The menu a user may see (MenuItem.permission against a `can` checker)
export { filterMenuByPermission } from '../utils/menu-helpers'

// ============================================================================
// NAVIGATION COMPONENTS
// ============================================================================
// Modern Sidebar
export { ModernSidebar } from '../layouts/ModernSidebar'
export type { ModernSidebarProps } from '../layouts/ModernSidebar'

// Command Palette
export { CommandPalette } from '../navigation'
export type { CommandPaletteProps, CommandPaletteItem } from '../navigation'

// ============================================================================
// TOOLBAR COMPONENTS
// ============================================================================
export { TabToolbar } from '../components/toolbar/TabToolbar'
export type {
  SelectOption as TabToolbarSelectOption,
  PeriodOption as TabToolbarPeriodOption,
  StatPill as TabToolbarStatPill,
  FilterButtonOption as TabToolbarFilterButtonOption,
} from '../components/toolbar/TabToolbar'

// ============================================================================
// SHELL COMPONENTS
// ============================================================================
export { ShellPage } from '../layouts/shell'
export type { ShellPageProps } from '../layouts/shell'
export { useShellPage } from '../layouts/shell'
export type { ShellPageContextValue } from '../layouts/shell'
export { AdminHeader } from '../layouts/shell'
export type { AdminHeaderProps } from '../layouts/shell'
export { AdminTabs } from '../layouts/shell'
export type { AdminTabsProps } from '../layouts/shell'
export { AdminPortal } from '../layouts/shell'
export type { AdminPortalProps } from '../layouts/shell'
export { ShellContent } from '../layouts/shell'
export type { ShellContentProps } from '../layouts/shell'
export type { PageHeaderConfig } from '../types/shell'

// ============================================================================
// IMPERSONATION
// ============================================================================
export {
  ImpersonationBanner,
  ImpersonationDialog,
} from '../components/impersonation'
export type {
  ImpersonationBannerProps,
  ImpersonationDialogProps,
  ImpersonationUserOption,
  ImpersonationConfirmResult,
} from '../components/impersonation'

// ============================================================================
// AUTH FORMS
// ============================================================================
export { SignInForm, ForgotPasswordForm } from '../components/auth'
export type {
  SignInFormProps,
  SignInFormValues,
  SignInFormResult,
  ForgotPasswordFormProps,
} from '../components/auth'
