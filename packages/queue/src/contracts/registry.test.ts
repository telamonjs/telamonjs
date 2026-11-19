import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { JobContractRegistry } from './registry'
import type { JobDefinition } from './types'

function makeContract(
  overrides: Partial<JobDefinition> = {}
): JobDefinition {
  return {
    name: 'imports_clientes',
    module: 'imports',
    description: 'Imports clients from the legacy system',
    dispatchable: true,
    ...overrides,
  }
}

describe('JobContractRegistry', () => {
  describe('register() / get()', () => {
    it('registers and retrieves a contract by name', () => {
      const registry = new JobContractRegistry()
      registry.register(makeContract())

      expect(registry.get('imports_clientes')).toMatchObject({
        name: 'imports_clientes',
        module: 'imports',
        dispatchable: true,
      })
    })

    it('returns undefined for a name that was never registered', () => {
      const registry = new JobContractRegistry()
      expect(registry.get('never-registered')).toBeUndefined()
    })

    it('keeps schema and defaultOptions on the stored contract', () => {
      const registry = new JobContractRegistry()
      const schema = z.object({ id: z.string() })
      registry.register(
        makeContract({ schema, defaultOptions: { attempts: 3 } })
      )

      const stored = registry.get('imports_clientes')
      expect(stored?.schema).toBe(schema)
      expect(stored?.defaultOptions).toEqual({ attempts: 3 })
    })

    it('warns and skips a duplicate registration instead of throwing', () => {
      const registry = new JobContractRegistry()
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      registry.register(makeContract({ description: 'first' }))
      expect(() =>
        registry.register(makeContract({ description: 'second' }))
      ).not.toThrow()

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('imports_clientes')
      )
      expect(registry.get('imports_clientes')?.description).toBe('first')

      warnSpy.mockRestore()
    })
  })

  describe('registerMany()', () => {
    it('registers every contract in the array', () => {
      const registry = new JobContractRegistry()
      registry.registerMany([
        makeContract({ name: 'job-a' }),
        makeContract({ name: 'job-b' }),
      ])

      expect(registry.getAll().map(c => c.name).sort()).toEqual([
        'job-a',
        'job-b',
      ])
    })
  })

  describe('getAll() / getDispatchable()', () => {
    it('getAll() returns every registered contract', () => {
      const registry = new JobContractRegistry()
      registry.registerMany([
        makeContract({ name: 'job-a' }),
        makeContract({ name: 'job-b', dispatchable: false }),
      ])

      expect(registry.getAll()).toHaveLength(2)
    })

    it('getDispatchable() filters to dispatchable: true only', () => {
      const registry = new JobContractRegistry()
      registry.registerMany([
        makeContract({ name: 'job-a', dispatchable: true }),
        makeContract({ name: 'job-b', dispatchable: false }),
      ])

      expect(registry.getDispatchable().map(c => c.name)).toEqual(['job-a'])
    })

    it('returns an empty array when nothing is registered', () => {
      const registry = new JobContractRegistry()
      expect(registry.getAll()).toEqual([])
      expect(registry.getDispatchable()).toEqual([])
    })
  })

  describe('getByModule() / getModules()', () => {
    it('getByModule() filters contracts by module', () => {
      const registry = new JobContractRegistry()
      registry.registerMany([
        makeContract({ name: 'job-a', module: 'imports' }),
        makeContract({ name: 'job-b', module: 'gateway' }),
        makeContract({ name: 'job-c', module: 'imports' }),
      ])

      expect(
        registry.getByModule('imports').map(c => c.name).sort()
      ).toEqual(['job-a', 'job-c'])
    })

    it('getModules() returns unique module names', () => {
      const registry = new JobContractRegistry()
      registry.registerMany([
        makeContract({ name: 'job-a', module: 'imports' }),
        makeContract({ name: 'job-b', module: 'imports' }),
        makeContract({ name: 'job-c', module: 'gateway' }),
      ])

      expect(registry.getModules().sort()).toEqual(['gateway', 'imports'])
    })
  })

  describe('instance isolation', () => {
    it('two instances do not share state', () => {
      const a = new JobContractRegistry()
      const b = new JobContractRegistry()

      a.register(makeContract({ name: 'only-in-a' }))

      expect(a.get('only-in-a')).toBeDefined()
      expect(b.get('only-in-a')).toBeUndefined()
    })
  })
})
