import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Msg } from './MsgComponent'

it('renders a translated message by full key', () => {
  render(<Msg k='telamonjs.common.save' />)
  expect(screen.getByText('Salvar')).toBeInTheDocument()
})
