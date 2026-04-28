import { describe, expect, test } from 'bun:test'
import { createDefaultScheduler, type IScheduler, type IStream, just } from '../src/stream/index.js'
import { recover } from '../src/stream-extended/index.js'

interface Captured<T> {
  events: { time: number; value: T }[]
  scheduler: IScheduler
}

// Subscribe a stream for `durationMs`, then dispose. Records each event with
// the scheduler-time delta from subscription start so we can assert spacing.
const collect = <T>(s: IStream<T>, durationMs: number): Promise<Captured<T>> =>
  new Promise((resolve, reject) => {
    const scheduler = createDefaultScheduler()
    const start = scheduler.time()
    const events: { time: number; value: T }[] = []
    const disposable = s.run(
      {
        event(time, value) {
          events.push({ time: time - start, value })
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
      resolve({ events, scheduler })
    }, durationMs)
  })

describe('recover', () => {
  test('re-subscribes after the source ends', async () => {
    const { events } = await collect(recover({ recoverTime: 25 }, just(7)), 130)
    expect(events.length).toBeGreaterThanOrEqual(3)
    for (const ev of events) expect(ev.value).toBe(7)
  })

  test('honours recoverTime as a minimum gap between attempts', async () => {
    const recoverTime = 40
    const { events } = await collect(recover({ recoverTime }, just('x')), 220)
    expect(events.length).toBeGreaterThanOrEqual(4)
    // First emission is immediate (no prior run to throttle against).
    // Subsequent emissions must be at least `recoverTime` apart, modulo a
    // small scheduler tolerance for setTimeout coarseness.
    const tolerance = 10
    for (let i = 1; i < events.length; i++) {
      const gap = events[i].time - events[i - 1].time
      expect(gap).toBeGreaterThanOrEqual(recoverTime - tolerance)
    }
  })

  test('no extra delay when the previous run lasted longer than recoverTime', async () => {
    // Source that takes ~50ms to emit and end. With recoverTime=10, the
    // throttle should be a no-op and the next attempt fires immediately.
    const slow: IStream<number> = {
      run(sink, scheduler) {
        const handle = setTimeout(() => {
          const t = scheduler.time()
          sink.event(t, 1)
          sink.end(t)
        }, 50)
        return { [Symbol.dispose]: () => clearTimeout(handle) }
      }
    }
    const { events } = await collect(recover({ recoverTime: 10 }, slow), 220)
    // ~4 emissions expected within 220ms when each attempt costs 50ms and
    // the throttle is inactive.
    expect(events.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < events.length; i++) {
      const gap = events[i].time - events[i - 1].time
      // Gap should track the source's runtime, not recoverTime.
      expect(gap).toBeGreaterThanOrEqual(40)
      expect(gap).toBeLessThan(80)
    }
  })

  test('recoverWith is called on each retry with the upcoming delay', async () => {
    const calls: number[] = []
    const recoverTime = 30
    await collect(
      recover(
        {
          recoverTime,
          recoverWith: (source, delayMs) => {
            calls.push(delayMs)
            return source
          }
        },
        just(0)
      ),
      130
    )
    // First subscription is the source itself (no recoverWith call yet).
    // Each subsequent attempt invokes recoverWith with delayMs ≈ recoverTime.
    expect(calls.length).toBeGreaterThanOrEqual(2)
    // Each call's delayMs is the gap until the next attempt fires. It should
    // sit at or just below recoverTime, with small slack for scheduler
    // jitter (setTimeout can fire a hair early on some platforms, making
    // `time - lastRuntime` slightly negative inside recover).
    const jitter = 5
    for (const d of calls) {
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThanOrEqual(recoverTime + jitter)
    }
  })

  test('curried form returns a function that is type-equivalent to the direct form', async () => {
    const op = recover<number>({ recoverTime: 25 })
    const { events } = await collect(op(just(42)), 90)
    expect(events.length).toBeGreaterThanOrEqual(2)
    for (const ev of events) expect(ev.value).toBe(42)
  })
})
