import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DialogHeaderContent } from './DialogHeaderContent'
import type { DialogHeaderConfig } from '../../types/dialog-header'

interface U {
  name: string
  active: boolean
}
const config: DialogHeaderConfig<U> = {
  icon: 'User',
  title: u => u.name,
  iconColor: u => (u.active ? 'green' : 'red'),
  gradient: u => (u.active ? 'from-green-50 to-emerald-50' : null),
}

const parts = (container: HTMLElement) => ({
  header: container.firstElementChild as HTMLElement,
  iconBox: container.querySelector('.rounded-full') as HTMLElement,
})

describe('DialogHeaderContent iconColor/gradient as functions of the item', () => {
  it('resolves both with the item', () => {
    const { container } = render(
      <DialogHeaderContent<U> item={{ name: 'Ana', active: true }} mode='view' config={config} />
    )
    const { header, iconBox } = parts(container)
    expect(iconBox).toHaveClass('bg-green-600')
    expect(header).toHaveClass('from-green-50', 'to-emerald-50')
  })

  it('falls back to the default gradient when the function returns nothing', () => {
    const { container } = render(
      <DialogHeaderContent<U> item={{ name: 'Bia', active: false }} mode='view' config={config} />
    )
    const { header, iconBox } = parts(container)
    expect(iconBox).toHaveClass('bg-red-600')
    expect(header).toHaveClass('from-gray-50', 'to-slate-50')
  })

  it('without an item (create) uses gray and the default gradient', () => {
    const { container } = render(<DialogHeaderContent<U> item={null} mode='create' config={config} />)
    const { header, iconBox } = parts(container)
    expect(iconBox).toHaveClass('bg-gray-600')
    expect(header).toHaveClass('from-gray-50', 'to-slate-50')
  })

  it('still takes plain values', () => {
    const { container } = render(
      <DialogHeaderContent<U>
        item={{ name: 'Ana', active: true }}
        mode='view'
        config={{ ...config, iconColor: 'purple', gradient: 'from-purple-50 to-indigo-50' }}
      />
    )
    const { header, iconBox } = parts(container)
    expect(iconBox).toHaveClass('bg-purple-600')
    expect(header).toHaveClass('from-purple-50', 'to-indigo-50')
  })
})
