import { peers, versions, type PackageKey } from './versions'

const LABELS: Record<PackageKey, string> = {
  ui: '@telamonjs/ui',
  auth: '@telamonjs/auth',
  cli: '@telamonjs/cli',
  permissions: '@telamonjs/permissions',
  queue: '@telamonjs/queue',
  logger: '@telamonjs/logger',
}

/** Inline version number, read from the package.json at build time. */
export function PkgVersion({ pkg }: { pkg: PackageKey }) {
  return <>{versions[pkg]}</>
}

/** Ecosystem version table, always in sync with the monorepo. */
export function VersionMatrix() {
  return (
    <table>
      <thead>
        <tr>
          <th>Package</th>
          <th>Version</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {(Object.keys(versions) as PackageKey[]).map(key => (
          <tr key={key}>
            <td>
              <code>{LABELS[key]}</code>
            </td>
            <td>{versions[key]}</td>
            <td>✅ Stable</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Peer dependencies of a package (optional ones marked), read from its package.json at build time. */
export function PeerDeps({ pkg }: { pkg: PackageKey }) {
  const list = peers[pkg]
  if (!list.length) return <p>No peer dependencies.</p>
  return (
    <table>
      <thead>
        <tr>
          <th>Peer dependency</th>
          <th>Range</th>
        </tr>
      </thead>
      <tbody>
        {list.map(peer => (
          <tr key={peer.name}>
            <td>
              <code>{peer.name}</code>
              {peer.optional && ' (optional)'}
            </td>
            <td>
              <code>{peer.range}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
