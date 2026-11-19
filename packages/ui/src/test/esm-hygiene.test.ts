import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// vitest runs with cwd at the package root
const PKG_ROOT = process.cwd()

// The package is ESM ("type": "module"). A bare require() inside a shipped file
// throws "require is not defined in ES module scope" under Node, which took
// down next dev for every consumer of the Tailwind preset (fixed in 7.1.1).
describe('ESM hygiene', () => {
  it('tailwind-preset.js is importable from a real ESM context', () => {
    const preset = join(PKG_ROOT, 'tailwind-preset.js')
    const out = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import p from ${JSON.stringify(preset)}; console.log(p.plugins.length)`,
      ],
      { encoding: 'utf8' }
    )
    expect(out.trim()).toBe('1')
  })

  it('no shipped source calls require()', () => {
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
          if (entry !== 'test' && entry !== '__mocks__') walk(full)
        } else if (
          /\.tsx?$/.test(entry) &&
          !/\.(test|spec)\.tsx?$/.test(entry)
        ) {
          if (/\brequire\(/.test(readFileSync(full, 'utf8')))
            offenders.push(full)
        }
      }
    }
    walk(join(PKG_ROOT, 'src'))
    expect(offenders).toEqual([])
  })
})
