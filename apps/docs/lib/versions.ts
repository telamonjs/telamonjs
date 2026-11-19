// Build-time version injection — single source of truth is each package.json.
// Never hardcode version numbers or peer ranges in MDX prose; use
// <PkgVersion pkg="..." />, <VersionMatrix /> or <PeerDeps pkg="..." />
// (registered in lib/mdx-components.tsx).
import ui from '../../../packages/ui/package.json'
import auth from '../../../packages/auth/package.json'
import cli from '../../../packages/cli/package.json'
import permissions from '../../../packages/permissions/package.json'
import queue from '../../../packages/queue/package.json'
import logger from '../../../packages/logger/package.json'

interface Manifest {
  name: string
  version: string
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

const manifests = { ui, auth, cli, permissions, queue, logger } satisfies Record<string, Manifest>

export type PackageKey = keyof typeof manifests

export const versions = Object.fromEntries(
  Object.entries(manifests).map(([key, m]) => [key, m.version])
) as Record<PackageKey, string>

export interface PeerDependency {
  name: string
  range: string
  optional: boolean
}

/** Peer dependencies per package, required ones first. */
export const peers = Object.fromEntries(
  Object.entries(manifests).map(([key, m]: [string, Manifest]) => [
    key,
    Object.entries(m.peerDependencies ?? {})
      .map(([name, range]) => ({ name, range, optional: m.peerDependenciesMeta?.[name]?.optional === true }))
      .sort((a, b) => Number(a.optional) - Number(b.optional)),
  ])
) as Record<PackageKey, PeerDependency[]>
