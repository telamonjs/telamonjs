import { describe, expect, it } from 'vitest'
import { TELAMONJS_LOCALES } from '../locales'
import { telamonjsMessages } from './index'

type Tree = { [k: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') acc[key] = v
    else Object.assign(acc, flatten(v, key))
    return acc
  }, {})
}

/** ICU argument names: `{count}`, `{count, plural, ...}`, `{d, date, short}` */
function icuArgs(message: string): string[] {
  return [...message.matchAll(/\{\s*([a-zA-Z_][\w]*)\s*[,}]/g)].map((m) => m[1]).sort()
}

const OTHERS = TELAMONJS_LOCALES.filter((l) => l !== 'pt-BR')

describe('telamonjs messages', () => {
  const base = flatten(telamonjsMessages['pt-BR'] as unknown as Tree)

  it.each(OTHERS)('%s has exactly the pt-BR keys', (locale) => {
    const other = flatten(telamonjsMessages[locale] as unknown as Tree)
    expect(Object.keys(other).sort()).toEqual(Object.keys(base).sort())
  })

  it.each(OTHERS)('%s uses the same ICU arguments per key', (locale) => {
    const other = flatten(telamonjsMessages[locale] as unknown as Tree)
    for (const [key, value] of Object.entries(base)) {
      expect({ key, args: icuArgs(other[key]) }).toEqual({ key, args: icuArgs(value) })
    }
  })

  it('has no empty messages', () => {
    for (const locale of TELAMONJS_LOCALES) {
      for (const [key, value] of Object.entries(flatten(telamonjsMessages[locale] as unknown as Tree))) {
        expect({ locale, key, empty: value.trim() === '' }).toEqual({ locale, key, empty: false })
      }
    }
  })
})
