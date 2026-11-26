import { afterEach, describe, expect, it, vi } from 'vitest'

const payload = '<svg></svg><img src=x onerror="alert(1)"><script>alert(1)</script>'

describe('sanitize-html', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('strips script vectors where a DOM exists', async () => {
    const { sanitizeSvg, sanitizeRichText } = await import('./sanitize-html')
    for (const out of [sanitizeSvg(payload), sanitizeRichText(payload)]) {
      expect(out).not.toContain('onerror')
      expect(out).not.toContain('<script')
    }
  })

  it('fails closed without a DOM (SSR): returns an empty string, never the raw input', async () => {
    vi.stubGlobal('window', undefined)
    vi.resetModules()
    const { sanitizeSvg, sanitizeRichText } = await import('./sanitize-html')
    expect(sanitizeSvg(payload)).toBe('')
    expect(sanitizeRichText(payload)).toBe('')
  })
})
