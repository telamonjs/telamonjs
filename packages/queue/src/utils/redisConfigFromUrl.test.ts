/**
 * Unit tests for redisConfigFromUrl
 */

import { describe, it, expect } from 'vitest'
import { redisConfigFromUrl } from './redisConfigFromUrl'

describe('redisConfigFromUrl', () => {
  describe('Rendering (basic parsing)', () => {
    it('parses host and port', () => {
      expect(redisConfigFromUrl('redis://localhost:6380')).toEqual({
        host: 'localhost',
        port: 6380,
      })
    })

    it('defaults port to 6379 when absent', () => {
      const config = redisConfigFromUrl('redis://myhost')
      expect(config.port).toBe(6379)
    })
  })

  describe('Interactions (credentials)', () => {
    it('parses password from userinfo', () => {
      const config = redisConfigFromUrl('redis://:secret@localhost:6379')
      expect(config.password).toBe('secret')
      expect(config.username).toBeUndefined()
    })

    it('parses username and password from userinfo', () => {
      const config = redisConfigFromUrl('redis://alice:secret@localhost:6379')
      expect(config.username).toBe('alice')
      expect(config.password).toBe('secret')
    })

    it('URL-decodes special characters in credentials', () => {
      const config = redisConfigFromUrl(
        'redis://alice:p%40ss%3Aword@localhost:6379'
      )
      expect(config.password).toBe('p@ss:word')
    })
  })

  describe('State Management (tls)', () => {
    it('does not set tls for redis://', () => {
      const config = redisConfigFromUrl('redis://localhost:6379')
      expect(config.tls).toBeUndefined()
    })

    it('sets tls for rediss://', () => {
      const config = redisConfigFromUrl('rediss://localhost:6380')
      expect(config.tls).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('omits password/username when absent from the URL', () => {
      const config = redisConfigFromUrl('redis://localhost:6379')
      expect(config).not.toHaveProperty('password')
      expect(config).not.toHaveProperty('username')
    })

    it('throws on a malformed URL', () => {
      expect(() => redisConfigFromUrl('not-a-url')).toThrow()
    })

    it('parses a full production-shaped URL (mirrors REDIS_URL usage)', () => {
      const config = redisConfigFromUrl(
        'redis://default:s3cr3t@redis.internal:6390'
      )
      expect(config).toEqual({
        host: 'redis.internal',
        port: 6390,
        username: 'default',
        password: 's3cr3t',
      })
    })
  })
})
