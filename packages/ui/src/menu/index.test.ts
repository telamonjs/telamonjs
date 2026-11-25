import { describe, it, expect, vi } from 'vitest'

// The point of this entry: usable from plain modules (and their tests) that
// have no Next.js runtime. Any import of next/* or next-intl must fail here.
vi.mock('next/navigation', () => {
  throw new Error('@telamonjs/ui/menu must not import next/navigation')
})
vi.mock('next-intl', () => {
  throw new Error('@telamonjs/ui/menu must not import next-intl')
})

describe('@telamonjs/ui/menu', () => {
  it('loads without Next.js and filters by permission', async () => {
    const { filterMenuByPermission } = await import('./index')
    const menu = filterMenuByPermission(
      [
        { id: 'a', type: 'single', title: 'A', href: '/a', permission: 'a.read' },
        { id: 'b', type: 'single', title: 'B', href: '/b', permission: 'b.read' },
      ],
      perm => perm === 'a.read'
    )
    expect(menu.map(i => i.id)).toEqual(['a'])
  })
})
