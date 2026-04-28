import { describe, expect, test } from 'bun:test'
import {
  at,
  awaitPromises,
  combineMap,
  constant,
  continueWith,
  createDefaultScheduler,
  delay,
  filter,
  type IScheduler,
  type ISink,
  type IStream,
  just,
  map,
  merge,
  skipRepeats,
  start,
  switchLatest,
  take,
  tap,
  zipMap
} from '../src/stream/index.js'

interface Capture<T> {
  values: T[]
  ended: boolean
  errored: unknown
  endTime: number | null
}

const subscribe = <T>(s: IStream<T>): { capture: Capture<T>; scheduler: IScheduler; dispose: () => void } => {
  const scheduler = createDefaultScheduler()
  const start = scheduler.time()
  const capture: Capture<T> = { values: [], ended: false, errored: null, endTime: null }
  const sink: ISink<T> = {
    event(_, value) {
      capture.values.push(value)
    },
    error(_, err) {
      capture.errored = err
    },
    end(time) {
      capture.ended = true
      capture.endTime = time - start
    }
  }
  const disposable = s.run(sink, scheduler)
  return { capture, scheduler, dispose: () => disposable[Symbol.dispose]?.() }
}

const settle = (ms = 5): Promise<void> => new Promise(r => setTimeout(r, ms))

const collect = async <T>(s: IStream<T>, durationMs: number): Promise<Capture<T>> => {
  const { capture, dispose } = subscribe(s)
  await settle(durationMs)
  dispose()
  return capture
}

// Stream that emits a sequence of values via repeated setTimeouts then ends.
const fromSchedule = <T>(items: Array<{ at: number; value: T }>, endAt: number): IStream<T> => ({
  run(sink, scheduler) {
    const handles: ReturnType<typeof setTimeout>[] = []
    for (const { at: when, value } of items) {
      handles.push(
        setTimeout(() => {
          sink.event(scheduler.time(), value)
        }, when)
      )
    }
    handles.push(setTimeout(() => sink.end(scheduler.time()), endAt))
    return {
      [Symbol.dispose]() {
        handles.forEach(h => clearTimeout(h))
      }
    }
  }
})

describe('sources', () => {
  test('just emits a single value and ends', async () => {
    const c = await collect(just(42), 10)
    expect(c.values).toEqual([42])
    expect(c.ended).toBe(true)
  })

  test('at emits at the scheduled time and ends', async () => {
    const { capture, scheduler } = subscribe(at(30))
    await settle(50)
    expect(capture.values).toHaveLength(1)
    expect(capture.values[0]).toBeGreaterThanOrEqual(28)
    expect(capture.ended).toBe(true)
    expect(scheduler.time()).toBeGreaterThan(30)
  })
})

describe('pure transforms', () => {
  test('map applies the function to each value', async () => {
    const src = fromSchedule(
      [
        { at: 5, value: 1 },
        { at: 15, value: 2 },
        { at: 25, value: 3 }
      ],
      40
    )
    const c = await collect(
      map(x => x * 10, src),
      60
    )
    expect(c.values).toEqual([10, 20, 30])
    expect(c.ended).toBe(true)
  })

  test('filter keeps only values that match the predicate', async () => {
    const src = fromSchedule(
      [
        { at: 5, value: 1 },
        { at: 10, value: 2 },
        { at: 15, value: 3 },
        { at: 20, value: 4 }
      ],
      35
    )
    const c = await collect(
      filter(x => x % 2 === 0, src),
      55
    )
    expect(c.values).toEqual([2, 4])
  })

  test('tap runs side effects without altering values', async () => {
    const seen: number[] = []
    const c = await collect(
      tap(v => seen.push(v as number), just(7)),
      10
    )
    expect(seen).toEqual([7])
    expect(c.values).toEqual([7])
  })

  test('constant replaces every value with the given constant', async () => {
    const src = fromSchedule(
      [
        { at: 5, value: 'a' },
        { at: 10, value: 'b' },
        { at: 15, value: 'c' }
      ],
      25
    )
    const c = await collect(constant(99, src), 40)
    expect(c.values).toEqual([99, 99, 99])
  })

  test('skipRepeats drops consecutive duplicates only', async () => {
    const src = fromSchedule(
      [
        { at: 5, value: 1 },
        { at: 10, value: 1 },
        { at: 15, value: 2 },
        { at: 20, value: 2 },
        { at: 25, value: 1 }
      ],
      35
    )
    const c = await collect(skipRepeats(src), 55)
    expect(c.values).toEqual([1, 2, 1])
  })
})

describe('merging', () => {
  test('merge interleaves events from all sources by emit time', async () => {
    const a = fromSchedule(
      [
        { at: 5, value: 'a1' },
        { at: 25, value: 'a2' }
      ],
      40
    )
    const b = fromSchedule(
      [
        { at: 15, value: 'b1' },
        { at: 35, value: 'b2' }
      ],
      45
    )
    const c = await collect(merge(a, b), 65)
    expect(c.values).toEqual(['a1', 'b1', 'a2', 'b2'])
  })

  test('start prepends a synchronous initial value', async () => {
    const src = fromSchedule(
      [
        { at: 5, value: 1 },
        { at: 10, value: 2 }
      ],
      20
    )
    const c = await collect(start(0, src), 40)
    expect(c.values).toEqual([0, 1, 2])
  })
})

describe('multi-stream combinators', () => {
  test('combineMap waits for every input to emit, then fires on each subsequent event', async () => {
    const a = fromSchedule(
      [
        { at: 5, value: 1 },
        { at: 25, value: 2 }
      ],
      40
    )
    const b = fromSchedule(
      [
        { at: 15, value: 'x' },
        { at: 35, value: 'y' }
      ],
      45
    )
    const c = await collect(
      combineMap((n, s) => `${n}${s}`, a, b),
      65
    )
    // Combined only emits once both streams have produced at least one value.
    // First combined value at b's first emit (15ms), then on every subsequent
    // emit from either source.
    expect(c.values).toEqual(['1x', '2x', '2y'])
  })

  test('zipMap pairs values in lockstep and ends with the shortest input', async () => {
    const a = fromSchedule(
      [
        { at: 5, value: 1 },
        { at: 15, value: 2 },
        { at: 25, value: 3 }
      ],
      40
    )
    const b = fromSchedule(
      [
        { at: 10, value: 'a' },
        { at: 20, value: 'b' }
      ],
      30
    )
    const c = await collect(
      zipMap((n, s) => `${n}${s}`, a, b),
      55
    )
    expect(c.values).toEqual(['1a', '2b'])
  })
})

describe('flattening', () => {
  test('switchLatest disposes the previous inner stream when a new outer event arrives', async () => {
    let inner1Disposed = false
    let inner1EmittedAfterSwitch = false
    const inner1: IStream<string> = {
      run(sink, scheduler) {
        const t1 = setTimeout(() => sink.event(scheduler.time(), 'a1'), 5)
        const t2 = setTimeout(() => {
          inner1EmittedAfterSwitch = true
          sink.event(scheduler.time(), 'a2-late')
        }, 30)
        return {
          [Symbol.dispose]() {
            inner1Disposed = true
            clearTimeout(t1)
            clearTimeout(t2)
          }
        }
      }
    }
    const inner2 = fromSchedule(
      [
        { at: 5, value: 'b1' },
        { at: 15, value: 'b2' }
      ],
      30
    )
    const outer = fromSchedule(
      [
        { at: 1, value: inner1 },
        { at: 15, value: inner2 }
      ],
      40
    )
    const c = await collect(switchLatest(outer), 80)
    expect(c.values).toEqual(['a1', 'b1', 'b2'])
    expect(inner1Disposed).toBe(true)
    expect(inner1EmittedAfterSwitch).toBe(false)
  })
})

describe('sequencing', () => {
  test('continueWith subscribes the next stream when the source ends', async () => {
    const c = await collect(
      continueWith(() => just('after'), just('first')),
      30
    )
    expect(c.values).toEqual(['first', 'after'])
    expect(c.ended).toBe(true)
  })

  test('take(n) ends immediately after the n-th value', async () => {
    const src = fromSchedule(
      [
        { at: 5, value: 'a' },
        { at: 10, value: 'b' },
        { at: 15, value: 'c' },
        { at: 20, value: 'd' }
      ],
      35
    )
    const c = await collect(take(2, src), 40)
    expect(c.values).toEqual(['a', 'b'])
    expect(c.ended).toBe(true)
    expect(c.endTime).not.toBeNull()
    expect(c.endTime!).toBeLessThan(15) // ends right after second value
  })
})

describe('timing', () => {
  test('delay shifts every event by the configured amount and propagates end after the same delay', async () => {
    const src = fromSchedule(
      [
        { at: 5, value: 'a' },
        { at: 15, value: 'b' }
      ],
      20
    )
    const { capture } = subscribe(delay(30, src))
    await settle(20)
    // At ~20ms, neither event should have surfaced yet (each waits another ~30ms).
    expect(capture.values).toEqual([])
    await settle(40) // ~60ms total
    expect(capture.values).toEqual(['a', 'b'])
    await settle(20) // ~80ms total — end fires at source-end (20ms) + delay (30ms) = ~50ms
    expect(capture.ended).toBe(true)
  })

  test('dispose cancels in-flight delayed events', async () => {
    const src = fromSchedule(
      [
        { at: 5, value: 'a' },
        { at: 10, value: 'b' }
      ],
      20
    )
    const { capture, dispose } = subscribe(delay(40, src))
    await settle(15) // both source events emitted, but delay timers haven't fired
    expect(capture.values).toEqual([])
    dispose()
    await settle(40)
    // After dispose nothing should ever surface.
    expect(capture.values).toEqual([])
  })
})

describe('promises', () => {
  test('awaitPromises preserves source order regardless of resolution order', async () => {
    // Earlier-emitted promises resolve LATER; awaitPromises must still emit
    // in source order.
    const slow = new Promise<number>(r => setTimeout(() => r(1), 30))
    const fast = Promise.resolve(2)
    const src: IStream<Promise<number>> = {
      run(sink, scheduler) {
        sink.event(scheduler.time(), slow)
        const h = setTimeout(() => {
          const t = scheduler.time()
          sink.event(t, fast)
          sink.end(t)
        }, 5)
        return {
          [Symbol.dispose]() {
            clearTimeout(h)
          }
        }
      }
    }
    const c = await collect(awaitPromises(src), 60)
    expect(c.values).toEqual([1, 2])
    expect(c.ended).toBe(true)
  })
})
