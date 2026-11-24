import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  LOG_LEVEL_NAMES_UPPER,
  getLogLevelFromEnv,
  parseLogLevel,
  shouldLog,
} from '../../../src/core/levels'
import { LogLevel } from '../../../src/core/types'

describe('parseLogLevel', () => {
  it.each([
    ['fatal', LogLevel.FATAL],
    ['ERROR', LogLevel.ERROR],
    ['warn', LogLevel.WARN],
    ['Warning', LogLevel.WARN],
    ['info', LogLevel.INFO],
    ['debug', LogLevel.DEBUG],
    ['trace', LogLevel.TRACE],
  ])('parses %s case-insensitively', (input, expected) => {
    expect(parseLogLevel(input)).toBe(expected)
  })

  it('passes a numeric level through', () => {
    expect(parseLogLevel(LogLevel.DEBUG)).toBe(LogLevel.DEBUG)
  })

  it('falls back to INFO for an unknown name', () => {
    expect(parseLogLevel('verbose')).toBe(LogLevel.INFO)
    expect(parseLogLevel('')).toBe(LogLevel.INFO)
  })
})

describe('shouldLog', () => {
  it('logs a level at or above the minimum severity', () => {
    expect(shouldLog(LogLevel.ERROR, LogLevel.WARN)).toBe(true)
    expect(shouldLog(LogLevel.WARN, LogLevel.WARN)).toBe(true)
    expect(shouldLog(LogLevel.INFO, LogLevel.WARN)).toBe(false)
    expect(shouldLog(LogLevel.FATAL, LogLevel.FATAL)).toBe(true)
    expect(shouldLog(LogLevel.TRACE, LogLevel.DEBUG)).toBe(false)
  })
})

describe('LOG_LEVEL_NAMES_UPPER', () => {
  it('names every level', () => {
    expect(Object.values(LOG_LEVEL_NAMES_UPPER)).toEqual([
      'FATAL',
      'ERROR',
      'WARN',
      'INFO',
      'DEBUG',
      'TRACE',
    ])
  })
})

describe('getLogLevelFromEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('LOG_LEVEL wins over NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LOG_LEVEL', 'debug')
    expect(getLogLevelFromEnv()).toBe(LogLevel.DEBUG)
  })

  it.each([
    ['development', LogLevel.DEBUG],
    ['dev', LogLevel.DEBUG],
    ['production', LogLevel.INFO],
    ['prod', LogLevel.INFO],
    ['test', LogLevel.ERROR],
  ])('maps NODE_ENV=%s', (env, expected) => {
    vi.stubEnv('LOG_LEVEL', '')
    vi.stubEnv('NODE_ENV', env)
    expect(getLogLevelFromEnv()).toBe(expected)
  })

  it('parses an explicit level name and defaults to INFO for garbage', () => {
    vi.stubEnv('LOG_LEVEL', 'warn')
    expect(getLogLevelFromEnv()).toBe(LogLevel.WARN)
    vi.stubEnv('LOG_LEVEL', 'loud')
    expect(getLogLevelFromEnv()).toBe(LogLevel.INFO)
  })

  it('defaults to INFO when neither variable is set', () => {
    vi.stubEnv('LOG_LEVEL', '')
    vi.stubEnv('NODE_ENV', '')
    expect(getLogLevelFromEnv()).toBe(LogLevel.INFO)
  })
})
