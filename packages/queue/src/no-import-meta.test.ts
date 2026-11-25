import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Consumers whose test runner transpiles this package to CommonJS (Jest +
// ts-jest in Nest apps) fail to load any module that contains `import.meta`:
// "SyntaxError: Cannot use 'import.meta' outside a module". queue 1.4.0 shipped
// one in the metrics path and broke every spec importing the root entry.
const SRC = join(__dirname)
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

describe('published source', () => {
  it('never uses import.meta (breaks CommonJS-transpiling consumers)', () => {
    const offenders = walk(SRC)
      .filter(f => f.endsWith('.ts') && !/\.(test|spec|test-d)\.ts$/.test(f))
      .filter(f => /\bimport\.meta\b/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
