'use client'

// Modern app shell
export { AppShell } from './AppShell'
export type { AppShellProps } from './AppShell'

// Canonical admin shell — replaces hand-rolled AdminLayout boilerplate
export { AdminShell } from './AdminShell'
export type { AdminShellProps, AdminShellBreadcrumbProps } from './AdminShell'

// Light/dark switch (next-themes) — AdminShell `themeToggle` or standalone
export { ThemeToggle } from './ThemeToggle'
export type { ThemeToggleProps } from './ThemeToggle'
