import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { Home, User, Circle } from 'lucide-react'
import { getIcon, setIconResolver, renderIcon } from './icon'

describe('icon-map (curated PascalCase registry)', () => {
  afterEach(() => {
    // Always clear the external resolver so tests stay isolated.
    setIconResolver(null)
  })

  describe('getIcon (curated map)', () => {
    it('returns the mapped component for a known name', () => {
      expect(getIcon('Home')).toBe(Home)
    })

    it('falls back to Circle for an unknown name', () => {
      expect(getIcon('TotallyNotAnIcon')).toBe(Circle)
    })
  })

  describe('setIconResolver (project registry)', () => {
    it('consults the external resolver FIRST for string names', () => {
      const ProjectOnly = () => null
      setIconResolver(name => (name === 'ScrollText' ? ProjectOnly : null))

      // Name absent from the curated map now resolves via the project resolver.
      expect(getIcon('ScrollText')).toBe(ProjectOnly)
    })

    it('falls back to the curated map when the resolver returns null/undefined', () => {
      setIconResolver(() => null)
      expect(getIcon('Home')).toBe(Home)
    })

    it('falls back to Circle when neither resolver nor map has the name', () => {
      setIconResolver(() => undefined)
      expect(getIcon('TotallyNotAnIcon')).toBe(Circle)
    })

    it('lets the resolver override even a curated name', () => {
      const Override = () => null
      setIconResolver(name => (name === 'Home' ? Override : null))
      expect(getIcon('Home')).toBe(Override)
    })

    it('can be cleared with null, restoring curated-only resolution', () => {
      const Override = () => null
      setIconResolver(() => Override)
      expect(getIcon('Home')).toBe(Override)

      setIconResolver(null)
      expect(getIcon('Home')).toBe(Home)
    })
  })
})

describe('renderIcon', () => {
  it('should render null when icon is null', () => {
    const result = renderIcon(null, 'h-4 w-4', '')
    expect(result).toBeNull()
  })

  it('should render fallback icon when icon is undefined', () => {
    const { container } = render(
      <>{renderIcon(undefined, 'h-4 w-4', 'Circle')}</>
    )
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('should render Lucide component from function', () => {
    const { container } = render(<>{renderIcon(User, 'h-4 w-4')}</>)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.classList.contains('h-4')).toBe(true)
    expect(svg?.classList.contains('w-4')).toBe(true)
  })

  it('should render icon from string name', () => {
    const { container } = render(<>{renderIcon('User', 'h-5 w-5')}</>)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.classList.contains('h-5')).toBe(true)
    expect(svg?.classList.contains('w-5')).toBe(true)
  })

  it('should render fallback for invalid string name', () => {
    const { container } = render(
      <>{renderIcon('InvalidIconName', 'h-4 w-4', 'Circle')}</>
    )
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('should render React element', () => {
    const CustomIcon = <div data-testid='custom-icon'>Custom</div>
    const { getByTestId } = render(<>{renderIcon(CustomIcon)}</>)
    expect(getByTestId('custom-icon')).toBeTruthy()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <>{renderIcon(User, 'h-8 w-8 text-blue-500')}</>
    )
    const svg = container.querySelector('svg')
    expect(svg?.classList.contains('h-8')).toBe(true)
    expect(svg?.classList.contains('w-8')).toBe(true)
    expect(svg?.classList.contains('text-blue-500')).toBe(true)
  })

  it('should use default className when not provided', () => {
    const { container } = render(<>{renderIcon(User)}</>)
    const svg = container.querySelector('svg')
    expect(svg?.classList.contains('h-4')).toBe(true)
    expect(svg?.classList.contains('w-4')).toBe(true)
  })
})
