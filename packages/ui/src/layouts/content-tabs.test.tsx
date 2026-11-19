'use client'

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '../test/ui-mocks'
import { ContentTabs } from './content-tabs'
import type { TabItem } from './content-tabs'
import { Home } from 'lucide-react'

// Minimal tab content for testing
const makeTab = (overrides: Partial<TabItem> = {}): TabItem => ({
  value: 'tab1',
  label: 'Tab 1',
  content: <div>Content 1</div>,
  ...overrides,
})

describe('ContentTabs', () => {
  describe('Rendering', () => {
    it('renders tab labels', () => {
      const tabs = [
        makeTab(),
        { value: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
      ]
      render(<ContentTabs tabs={tabs} />)
      expect(screen.getByText('Tab 1')).toBeInTheDocument()
      expect(screen.getByText('Tab 2')).toBeInTheDocument()
    })

    it('renders without icon when no icon provided', () => {
      const tabs = [makeTab()]
      render(<ContentTabs tabs={tabs} />)
      // No icon element expected
      expect(screen.queryByTestId(/^icon-/)).toBeNull()
    })
  })

  describe('Icon — string (preferred in link-mode)', () => {
    it('resolves string icon via getIcon and renders it (default variant)', () => {
      const tabs = [makeTab({ icon: 'Home' })]
      render(<ContentTabs tabs={tabs} />)
      // Lucide proxy mock renders <svg data-testid="icon-home">
      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
    })

    it('resolves string icon in non-default variant (Radix tabs path)', () => {
      const tabs = [makeTab({ icon: 'Home' })]
      render(<ContentTabs tabs={tabs} variant='pill' />)
      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
    })

    it('resolves unknown string icon to fallback (Circle)', () => {
      const tabs = [makeTab({ icon: 'NonExistentIconXYZ' })]
      render(<ContentTabs tabs={tabs} />)
      // getIcon returns Circle as fallback → mock renders icon-circle
      expect(screen.getByTestId('icon-circle')).toBeInTheDocument()
    })
  })

  describe('Icon — component (backward compat)', () => {
    it('renders a direct icon component (default variant)', () => {
      const tabs = [makeTab({ icon: Home })]
      render(<ContentTabs tabs={tabs} />)
      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
    })

    it('renders a direct icon component in non-default variant', () => {
      const tabs = [makeTab({ icon: Home })]
      render(<ContentTabs tabs={tabs} variant='underline' />)
      expect(screen.getByTestId('icon-home')).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('renders active tab content by default', () => {
      const tabs = [
        makeTab(),
        { value: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
      ]
      render(<ContentTabs tabs={tabs} />)
      expect(screen.getByText('Content 1')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('renders badge when provided', () => {
      const tabs = [makeTab({ badge: 5 })]
      render(<ContentTabs tabs={tabs} />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders shortLabel when provided', () => {
      const tabs = [makeTab({ shortLabel: 'T1' })]
      render(<ContentTabs tabs={tabs} />)
      expect(screen.getByText('T1')).toBeInTheDocument()
    })
  })
})
