import { describe, it, expect, vi } from 'vitest'
import { EventEmitter as NodeEventEmitter } from 'node:events'
import { publishWorkerEvents } from './publishWorkerEvents'
import type { Worker } from '../core/Worker.js'
import type { JobEventPublisher } from './JobEventPublisher.js'
import type { ILogger } from '@telamonjs/logger'

function makeFakeWorker(name: string) {
  const raw = new NodeEventEmitter()
  const worker = {
    getName: () => name,
    getRawWorker: () => raw,
  } as unknown as Worker
  return { worker, raw }
}

function makePublisher() {
  const publish = vi.fn(async () => {})
  return { publisher: { publish } as unknown as JobEventPublisher, publish }
}

describe('publishWorkerEvents', () => {
  describe('Interactions (wiring to JobEventPublisher)', () => {
    it('publishes a job:started event on the raw worker "active" event', () => {
      const { worker, raw } = makeFakeWorker('send-email')
      const { publisher, publish } = makePublisher()

      publishWorkerEvents([worker], publisher)
      raw.emit('active', { id: 'job-1', name: 'send-email', data: { to: 'a' } })

      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'job:started',
          jobId: 'job-1',
          jobName: 'send-email',
          data: { to: 'a' },
        })
      )
    })

    it('publishes a job:completed event on "completed"', () => {
      const { worker, raw } = makeFakeWorker('send-email')
      const { publisher, publish } = makePublisher()

      publishWorkerEvents([worker], publisher)
      raw.emit('completed', { id: 'job-2', name: 'send-email' }, { ok: true })

      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'job:completed',
          jobId: 'job-2',
          jobName: 'send-email',
          result: { ok: true },
        })
      )
    })

    it('publishes a job:failed event on "failed" with an error message', () => {
      const { worker, raw } = makeFakeWorker('send-email')
      const { publisher, publish } = makePublisher()

      publishWorkerEvents([worker], publisher)
      raw.emit('failed', { id: 'job-3', name: 'send-email' }, new Error('boom'))

      expect(publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'job:failed',
          jobId: 'job-3',
          jobName: 'send-email',
          error: 'boom',
        })
      )
    })

    it('wires every worker in the array independently', () => {
      const a = makeFakeWorker('job-a')
      const b = makeFakeWorker('job-b')
      const { publisher, publish } = makePublisher()

      publishWorkerEvents([a.worker, b.worker], publisher)
      a.raw.emit('active', { id: '1', name: 'job-a' })
      b.raw.emit('active', { id: '2', name: 'job-b' })

      expect(publish).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edge Cases', () => {
    it('does not throw and logs when "failed" fires without a job', () => {
      const { worker, raw } = makeFakeWorker('send-email')
      const { publisher, publish } = makePublisher()
      const logger = {
        debug() {},
        info() {},
        warn: vi.fn(),
        error() {},
      } as unknown as ILogger

      publishWorkerEvents([worker], publisher, { logger })
      expect(() =>
        raw.emit('failed', undefined, new Error('no job'))
      ).not.toThrow()

      expect(publish).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  describe('State Management (unsubscribe)', () => {
    it('returns an unsubscribe function that stops further publishing', () => {
      const { worker, raw } = makeFakeWorker('send-email')
      const { publisher, publish } = makePublisher()

      const unsubscribe = publishWorkerEvents([worker], publisher)
      unsubscribe()
      raw.emit('active', { id: 'job-1', name: 'send-email' })

      expect(publish).not.toHaveBeenCalled()
    })

    it('unsubscribe does not close the worker or the publisher', () => {
      const { worker } = makeFakeWorker('send-email')
      const { publisher } = makePublisher()
      const closeSpy = vi.fn()
      ;(publisher as unknown as { close: typeof closeSpy }).close = closeSpy

      const unsubscribe = publishWorkerEvents([worker], publisher)
      unsubscribe()

      expect(closeSpy).not.toHaveBeenCalled()
    })
  })
})
