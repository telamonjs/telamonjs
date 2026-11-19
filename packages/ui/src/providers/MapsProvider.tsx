'use client'

import { ReactNode } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'

interface MapsProviderProps {
  children: ReactNode
  apiKey: string
  /**
   * Language of the map UI/labels (BCP 47, e.g. `pt-BR`). `AppProviders` passes the
   * active locale; without it Google falls back to the browser language.
   */
  language?: string
  /** Region bias (`BR`). Default: the region part of `language`. */
  region?: string
}

export function MapsProvider({ children, apiKey, language, region }: MapsProviderProps) {
  if (!apiKey) {
    return <>{children}</>
  }

  return (
    <APIProvider apiKey={apiKey} language={language} region={region ?? language?.split('-')[1]}>
      {children}
    </APIProvider>
  )
}

export type { MapsProviderProps }
