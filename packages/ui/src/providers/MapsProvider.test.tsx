import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MapsProvider } from './MapsProvider'

const apiProviderSpy = vi.fn()
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: (props: { children: React.ReactNode }) => {
    apiProviderSpy(props)
    return <>{props.children}</>
  },
}))

describe('MapsProvider (consumer QA 7.3.1)', () => {
  it('loads Maps in the active locale (not the browser/en default)', () => {
    render(<MapsProvider apiKey='k' language='pt-BR'>x</MapsProvider>)
    expect(apiProviderSpy).toHaveBeenCalledWith(expect.objectContaining({ language: 'pt-BR', region: 'BR' }))
  })

  it('explicit region wins', () => {
    render(<MapsProvider apiKey='k' language='es' region='AR'>x</MapsProvider>)
    expect(apiProviderSpy).toHaveBeenLastCalledWith(expect.objectContaining({ language: 'es', region: 'AR' }))
  })
})
