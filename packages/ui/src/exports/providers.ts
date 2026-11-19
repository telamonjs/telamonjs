// ============================================================================
// PROVIDERS
// ============================================================================
export { AppProviders } from '../providers/AppProviders'
export type { ProvidersConfig } from '../providers/AppProviders'
export { SystemConfigProvider, useSystemConfig } from '../providers/ConfigProvider'
// NOTE: ConfigProvider (alias of SystemConfigProvider) lives in deprecated-aliases.ts

// App Store Provider (Zustand)
export { AppStoreProvider } from '../providers/AppStoreProvider'
export type { AppStoreProviderProps } from '../providers/AppStoreProvider'

// React Query Provider
// NOTE: do NOT re-export symbols from '@tanstack/react-query' through the barrel —
// with optimizePackageImports the optimizer rewrites the re-export to the
// origin in the CONSUMER's context, creating a duplicate react-query instance
// in link mode (provider in one copy, internal hooks in the other →
// "No QueryClient set"). Consumers import directly from
// '@tanstack/react-query'.
export { QueryClientProvider } from '../providers/QueryClientProvider'
// i18n: msg/MessageRef, hooks, LocaleSwitcher, messages. Never re-exports next-intl itself.
export * from '../i18n'

// Note: LayoutProvider (Context API version) was removed in
// Use AppStoreProvider + hooks (useLayout, useSidebar) instead

// ============================================================================
// ADDITIONAL PROVIDERS
// ============================================================================

export { QueryProvider } from '../providers/QueryProvider'

// ============================================================================
// AUTH RE-EXPORTS (next-auth/react)
// Re-export to guarantee consumers use the same module instance as the
// SessionProvider inside AppProviders, avoiding duplicated contexts
// when the package is installed via link: (symlink)
// ============================================================================
export { useSession, signIn, signOut, getSession } from 'next-auth/react'

// ============================================================================
// THEME
// ============================================================================
// Re-export of useTheme from next-themes (SAME instance as the ThemeProvider in
// AppProviders). Consumers must toggle the theme through here so next-themes
// remains the source of truth — avoids desync from touching the `dark` class
// directly and the duplicate-instance problem in link mode.
export { useTheme } from 'next-themes'
