/// <reference types="../vitest" />

import React from 'react'
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { JSDOM } from 'jsdom'
import * as matchers from '@testing-library/jest-dom/matchers'

// Import UI component mocks (this will execute the vi.mock calls)
import './ui-mocks'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Every render/renderHook runs inside the i18n provider (pt-BR, library messages) so
// the existing test files keep asserting pt-BR text without touching each one.
vi.mock('@testing-library/react', async (importOriginal) => {
  const rtl = await importOriginal<typeof import('@testing-library/react')>()
  const { NextIntlClientProvider } = await import('next-intl')
  const { telamonjsMessages } = await import('../i18n/messages')
  const { TelamonjsI18nProvider } = await import('../i18n/context')
  type Wrapper = React.ComponentType<{ children: React.ReactNode }>
  const I18n = ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale='pt-BR' messages={telamonjsMessages['pt-BR']} timeZone='America/Sao_Paulo'>
      <TelamonjsI18nProvider>{children}</TelamonjsI18nProvider>
    </NextIntlClientProvider>
  )
  const wrap =
    (Outer?: Wrapper): Wrapper =>
    ({ children }) => <I18n>{Outer ? <Outer>{children}</Outer> : children}</I18n>
  return {
    ...rtl,
    render: (ui: React.ReactElement, options?: Parameters<typeof rtl.render>[1]) =>
      rtl.render(ui, { ...options, wrapper: wrap(options?.wrapper as Wrapper | undefined) }),
    renderHook: (cb: (props: unknown) => unknown, options?: Parameters<typeof rtl.renderHook>[1]) =>
      rtl.renderHook(cb, { ...options, wrapper: wrap(options?.wrapper as Wrapper | undefined) }),
  }
})

// Node >= 25 ships a global `localStorage` getter (undefined without
// --localstorage-file); vitest's jsdom env skips keys already on globalThis,
// leaving `localStorage`/`sessionStorage` undefined and the jsdom window out
// of reach (`window`/`document.defaultView` are globalThis). Borrow real
// Storage objects from a throwaway JSDOM.
if (globalThis.localStorage === undefined) {
  const { window: w } = new JSDOM('', { url: 'http://localhost/' })
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, { value: w[key], configurable: true, writable: true })
  }
}

// Cleanup after each test case
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock HTMLElement.prototype.hasPointerCapture
HTMLElement.prototype.hasPointerCapture = vi.fn()
HTMLElement.prototype.setPointerCapture = vi.fn()
HTMLElement.prototype.releasePointerCapture = vi.fn()

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
})

// Mock window.scrollTo
window.scrollTo = vi.fn()

// Mock console methods to reduce noise in test output
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  // Suppress specific React warnings in tests
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }

  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})
