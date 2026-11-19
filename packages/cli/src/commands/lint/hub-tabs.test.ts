import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { lintProject } from './lint.js'

const root = mkdtempSync(join(tmpdir(), 'telamonjs-hub-tabs-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const TABS = `[${['a', 'b', 'c', 'd', 'e', 'f']
  .map((v) => `{ value: '${v}', label: '${v.toUpperCase()}', content: null }`)
  .join(', ')}]`

function hub(name: string, body: string): string {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'page.tsx'), body)
  return dir
}
const hubTabsFindings = (dir: string) => lintProject(dir).findings.filter((f) => f.rule === 'hub-tabs')

describe('hub-tabs', () => {
  it('warns for 6+ tabs on AdminTabs + useTabUrlSync', () => {
    const dir = hub(
      'tabs',
      `import { AdminTabs, useTabUrlSync } from '@telamonjs/ui'
const tabs = ${TABS}
export default function P() { const s = useTabUrlSync({ tabs }); return <AdminTabs tabs={tabs} {...s} /> }`
    )
    expect(hubTabsFindings(dir)).toHaveLength(1)
  })

  it('does not warn when the hub already uses AdminPortal', () => {
    const dir = hub(
      'portal',
      `import { AdminPortal, useTabUrlSync } from '@telamonjs/ui'
const tabs = ${TABS}
export default function P() { const s = useTabUrlSync({ tabs, allowNone: true }); return <AdminPortal tabs={tabs} {...s} /> }`
    )
    expect(hubTabsFindings(dir)).toEqual([])
  })

  it('does not warn for useTabUrlSync({ allowNone: true }) (portal launcher state)', () => {
    const dir = hub(
      'allow-none',
      `import { useTabUrlSync } from '@telamonjs/ui'
import { Portal } from './portal'
const tabs = ${TABS}
export default function P() { const s = useTabUrlSync({ tabs, allowNone: true }); return <Portal tabs={tabs} {...s} /> }`
    )
    expect(hubTabsFindings(dir)).toEqual([])
  })
})
