'use client'

// ============================================================================
// PUBLIC BARREL — re-exports every area from src/exports/*.ts.
// Public surface is pinned by src/index.test.ts (snapshot of exported
// names). Adding/removing an export here always changes that snapshot —
// treat a snapshot diff as a public API change, not a test to "fix".
// ============================================================================

// GUARD (see src/exports/providers.ts for the full rationale): do NOT
// re-export symbols from '@tanstack/react-query' through this barrel — with
// optimizePackageImports that creates a duplicate react-query instance in link
// mode ("No QueryClient set"). Consumers import directly from
// '@tanstack/react-query'.

export * from './exports/providers'
export * from './exports/stores-hooks'
export * from './exports/ui-primitives'
export * from './exports/layout-navigation'
export * from './exports/pages-dialogs'
export * from './exports/data-crud'
export * from './exports/forms'
export * from './exports/detail-reports'
export * from './exports/dashboard-charts'
export * from './exports/field-system'
export * from './exports/types-constants'
export * from './exports/utils-icons'
