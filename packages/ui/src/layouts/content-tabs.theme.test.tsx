/**
 * ContentTabs against the real ui/tabs primitives (content-tabs.test.tsx mocks
 * them): every variant's chrome must come from theme tokens so the tab bar
 * follows dark mode.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ContentTabs, type ContentTabsVariant } from './content-tabs'
import { rawNeutralClasses } from '../test/theme-tokens'

// the global setup mocks ui/tabs; the list/trigger classes live there
vi.unmock('../ui/tabs')

const tabs = [
  { value: 'a', label: 'A', content: <div>A</div>, badge: 2 },
  { value: 'b', label: 'B', content: <div>B</div> },
]

const variants: ContentTabsVariant[] = [
  'default',
  'underline',
  'pill',
  'glass',
  'gradient',
]

describe('ContentTabs theme tokens', () => {
  for (const variant of variants) {
    it(`${variant}: no raw neutral palette classes`, () => {
      const { container } = render(
        <ContentTabs tabs={tabs} variant={variant} />
      )
      expect(rawNeutralClasses(container)).toEqual([])
    })
  }
})
