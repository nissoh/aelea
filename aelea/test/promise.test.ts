import { describe, expect, test } from 'bun:test'
import { createDefaultScheduler, type IStream } from '../src/stream/index.js'
import { type PromiseState, PromiseStatus, promiseState } from '../src/stream-extended/index.js'

const collect = <T>(s: IStream<T>, durationMs: number): Promise<T[]> =>
  new Promise((resolve, reject) => {
    const scheduler = createDefaultScheduler()
    const events: T[] = []
    const disposable = s.run(
      {
        event(_, value) {
          events.push(value)
        },
        error(_, err) {
          reject(err)
        },
        end() {}
      },
      scheduler
    )
    setTimeout(() => {
      disposable[Symbol.dispose]?.()
      resolve(events)
    }, durationMs)
  })

const justPromise = <T>(p: Promise<T>): IStream<Promise<T>> => ({
  run(sink, scheduler) {
    const t = scheduler.time()
    sink.event(t, p)
    sink.end(t)
    return { [Symbol.dispose]() {} }
  }
})

describe('promiseState — happy paths', () => {
  test('emits PENDING then DONE for a resolving promise', async () => {
    const states = await collect(promiseState(justPromise(Promise.resolve(42))), 30)
    expect(states.map(s => s.status)).toEqual([PromiseStatus.PENDING, PromiseStatus.DONE])
    expect(states[1]).toEqual({ status: PromiseStatus.DONE, value: 42 })
  })

  test('emits PENDING then ERROR for a rejecting promise (Error rejection)', async () => {
    const err = new Error('boom')
    const states = await collect(promiseState(justPromise(Promise.reject(err))), 30)
    expect(states.map(s => s.status)).toEqual([PromiseStatus.PENDING, PromiseStatus.ERROR])
    expect((states[1] as { error: unknown }).error).toBe(err)
  })

  test('ends the state stream after the pending promise settles when source has ended', async () => {
    const p = new Promise<string>(resolve => setTimeout(() => resolve('ok'), 25))
    const events: PromiseState<string>[] = []
    const endedAt = await new Promise<number>((resolve, reject) => {
      const scheduler = createDefaultScheduler()
      const start = scheduler.time()
      promiseState(justPromise(p)).run(
        {
          event(_, v) {
            events.push(v)
          },
          error(_, e) {
            reject(e)
          },
          end(time) {
            resolve(time - start)
          }
        },
        scheduler
      )
    })
    expect(events.map(s => s.status)).toEqual([PromiseStatus.PENDING, PromiseStatus.DONE])
    expect(endedAt).toBeGreaterThanOrEqual(20)
  })

  test('ends immediately when source ends with no in-flight promise', async () => {
    const empty: IStream<Promise<unknown>> = {
      run(sink, scheduler) {
        sink.end(scheduler.time())
        return { [Symbol.dispose]() {} }
      }
    }
    const endedAt = await new Promise<number>(resolve => {
      const scheduler = createDefaultScheduler()
      const start = scheduler.time()
      promiseState(empty).run(
        {
          event() {
            throw new Error('should not emit')
          },
          error() {},
          end(time) {
            resolve(time - start)
          }
        },
        scheduler
      )
    })
    expect(endedAt).toBeLessThan(5)
  })

  test('re-emits PENDING on a fresh wave after a settled promise', async () => {
    let resolveP2!: (v: string) => void
    const p2 = new Promise<string>(r => {
      resolveP2 = r
    })

    const source: IStream<Promise<string>> = {
      run(sink, scheduler) {
        sink.event(scheduler.time(), Promise.resolve('a'))
        const h1 = setTimeout(() => sink.event(scheduler.time(), p2), 20)
        const h2 = setTimeout(() => sink.end(scheduler.time()), 60)
        return {
          [Symbol.dispose]() {
            clearTimeout(h1)
            clearTimeout(h2)
          }
        }
      }
    }
    const eventsP = collect(promiseState(source), 90)
    setTimeout(() => resolveP2('b'), 35)
    const states = (await eventsP).map(s => s.status)
    expect(states).toEqual([PromiseStatus.PENDING, PromiseStatus.DONE, PromiseStatus.PENDING, PromiseStatus.DONE])
  })
})

describe('promiseState — latest-wins (identity check)', () => {
  test('drops a stale resolution arriving after a newer promise has settled', async () => {
    let resolveP1!: (v: number) => void
    const p1 = new Promise<number>(r => {
      resolveP1 = r
    })
    const p2 = Promise.resolve(2)
    const source: IStream<Promise<number>> = {
      run(sink, scheduler) {
        sink.event(scheduler.time(), p1)
        const h = setTimeout(() => {
          const t = scheduler.time()
          sink.event(t, p2)
          sink.end(t)
        }, 5)
        return {
          [Symbol.dispose]() {
            clearTimeout(h)
          }
        }
      }
    }
    const eventsP = collect(promiseState(source), 60)
    setTimeout(() => resolveP1(1), 30) // resolve p1 AFTER p2 already won
    const dones = (await eventsP).filter(s => s.status === PromiseStatus.DONE)
    expect(dones).toEqual([{ status: PromiseStatus.DONE, value: 2 }])
  })
})

describe('promiseState — rejection payload preservation', () => {
  test('object rejection is forwarded as-is (not wrapped in Error)', async () => {
    const payload = { code: 500, body: 'kaboom' }
    const states = await collect(promiseState(justPromise(Promise.reject(payload))), 30)
    expect(states[0].status).toBe(PromiseStatus.PENDING)
    expect((states[1] as { error: unknown }).error).toBe(payload)
  })

  test('string rejection is forwarded as-is', async () => {
    const states = await collect(promiseState(justPromise(Promise.reject('plain text'))), 30)
    expect((states[1] as { error: unknown }).error).toBe('plain text')
  })
})

describe('promiseState — dispose semantics', () => {
  test('late settlements after dispose emit no further events', async () => {
    let resolveLate!: (v: number) => void
    const late = new Promise<number>(r => {
      resolveLate = r
    })

    const source: IStream<Promise<number>> = {
      run(sink, scheduler) {
        sink.event(scheduler.time(), late)
        return { [Symbol.dispose]() {} }
      }
    }

    const events: PromiseState<number>[] = []
    const scheduler = createDefaultScheduler()
    const disposable = promiseState(source).run(
      {
        event(_, v) {
          events.push(v)
        },
        error() {},
        end() {}
      },
      scheduler
    )

    // We've seen PENDING by now (synchronous on event).
    expect(events.map(s => s.status)).toEqual([PromiseStatus.PENDING])

    disposable[Symbol.dispose]?.()

    // Resolve AFTER dispose — should not emit DONE.
    resolveLate(42)
    await new Promise(r => setTimeout(r, 10))

    expect(events.map(s => s.status)).toEqual([PromiseStatus.PENDING])
  })
})
