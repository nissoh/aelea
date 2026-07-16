import { describe, expect, test } from 'bun:test'
import {
  combineMap,
  createBrowserScheduler,
  createDefaultScheduler,
  createNodeScheduler,
  delay,
  disposeNone,
  disposeWith,
  fromPromise,
  type IScheduler,
  type ISink,
  type IStream,
  type ITask,
  type ITime,
  just,
  merge,
  nullSink,
  periodic,
  sample,
  zip
} from '../src/stream/index.js'
import {
  behavior,
  multicast,
  PromiseStatus,
  promiseState,
  state,
  stream,
  tether
} from '../src/stream-extended/index.js'
import { createDomScheduler, createHeadlessScheduler } from '../src/ui/index.js'

interface Capture<T> {
  values: T[]
  ended: boolean
  errors: unknown[]
}

const captureSink = <T>(capture: Capture<T>): ISink<T> => ({
  event(_, value) {
    capture.values.push(value)
  },
  error(_, err) {
    capture.errors.push(err)
  },
  end() {
    capture.ended = true
  }
})

const subscribe = <T>(
  s: IStream<T>,
  scheduler: IScheduler = createDefaultScheduler()
): { capture: Capture<T>; scheduler: IScheduler; dispose: () => void } => {
  const capture: Capture<T> = { values: [], ended: false, errors: [] }
  const disposable = s.run(captureSink(capture), scheduler)
  return { capture, scheduler, dispose: () => disposable[Symbol.dispose]() }
}

const settle = (ms = 5): Promise<void> => new Promise(r => setTimeout(r, ms))

// Task whose run() does NOT check `active`, so it observes whether the
// scheduler's native timer actually fired after disposal.
const mkTask = (run: (time: ITime) => void): ITask => ({
  active: true,
  run,
  error: () => {},
  [Symbol.dispose]() {
    this.active = false
  }
})

// Wraps a real scheduler and records, per delay() call, whether the returned
// handle was disposed — so combinators that arm timers can be checked for
// actually cancelling them.
const spyScheduler = (): { scheduler: IScheduler; armed: { disposed: boolean }[] } => {
  const real = createDefaultScheduler()
  const armed: { disposed: boolean }[] = []
  const scheduler: IScheduler = {
    asap: task => real.asap(task),
    delay(task, interval) {
      const inner = real.delay(task, interval)
      const record = { disposed: false }
      armed.push(record)
      return {
        [Symbol.dispose]() {
          record.disposed = true
          inner[Symbol.dispose]()
        }
      }
    },
    time: () => real.time(),
    dayTime: () => real.dayTime()
  }
  return { scheduler, armed }
}

describe('scheduler delay disposal', () => {
  const schedulers = [
    ['node', createNodeScheduler],
    ['browser', createBrowserScheduler],
    ['dom', createDomScheduler],
    ['headless', createHeadlessScheduler]
  ] as const

  for (const [name, create] of schedulers) {
    test(`${name} scheduler cancels the native timer when a delayed task is disposed`, async () => {
      const scheduler = create()
      let fired = false
      const disposable = scheduler.delay(
        mkTask(() => {
          fired = true
        }),
        10
      )
      disposable[Symbol.dispose]()
      await settle(40)
      expect(fired).toBe(false)
    })
  }

  test('delay() disposes the scheduler handle of every pending event timer', () => {
    const { scheduler, armed } = spyScheduler()
    let push: ISink<number> | undefined
    const src = stream<number>(sink => {
      push = sink
      return disposeNone
    })
    const { dispose } = subscribe(delay(10_000, src), scheduler)

    push!.event(0, 1)
    push!.event(0, 2)
    push!.event(0, 3)
    expect(armed).toHaveLength(3)

    dispose()
    expect(armed.every(r => r.disposed)).toBe(true)
  })

  test('periodic disposal clears the currently-armed re-scheduled timer', async () => {
    const { scheduler, armed } = spyScheduler()
    const { capture, dispose } = subscribe(periodic(10), scheduler)

    await settle(35)
    expect(capture.values.length).toBeGreaterThanOrEqual(1)
    expect(armed.length).toBeGreaterThanOrEqual(2)

    dispose()
    expect(armed[armed.length - 1].disposed).toBe(true)

    const fired = capture.values.length
    await settle(30)
    expect(capture.values.length).toBe(fired)
  })
})

describe('state/tether late-subscriber replay', () => {
  test('state replays the latest value, not a stale snapshot', async () => {
    const scheduler = createDefaultScheduler()
    let push: ISink<number> | undefined
    const src = stream<number>(sink => {
      push = sink
      return disposeNone
    })
    const s = state()(src)

    const early = subscribe(s, scheduler)
    push!.event(scheduler.time(), 1)

    // Queue an emission of 2, then subscribe late in the same tick: the
    // replay task flushes after the queued emission and must not resurrect 1.
    scheduler.asap(mkTask(time => push!.event(time, 2)))
    const late = subscribe(s, scheduler)

    await settle(20)
    expect(early.capture.values).toEqual([1, 2])
    expect(late.capture.values[late.capture.values.length - 1]).toBe(2)
    expect(late.capture.values).not.toContain(1)
  })

  test('tether replays the latest value, not a stale snapshot', async () => {
    const scheduler = createDefaultScheduler()
    let push: ISink<number> | undefined
    const src = stream<number>(sink => {
      push = sink
      return disposeNone
    })
    const [primary, tethered] = tether(src)

    subscribe(primary, scheduler)
    push!.event(scheduler.time(), 1)

    scheduler.asap(mkTask(time => push!.event(time, 2)))
    const late = subscribe(tethered, scheduler)

    await settle(20)
    expect(late.capture.values[late.capture.values.length - 1]).toBe(2)
    expect(late.capture.values).not.toContain(1)
  })

  test('tether does not replay a cached value from a disposed primary subscription', async () => {
    const scheduler = createDefaultScheduler()
    let push: ISink<number> | undefined
    const src = stream<number>(sink => {
      push = sink
      return disposeNone
    })
    const [primary, tethered] = tether(src)

    const primaryCapture: Capture<number> = { values: [], ended: false, errors: [] }
    const primaryDisposable = primary.run(captureSink(primaryCapture), scheduler)
    push!.event(0, 1)

    // Late subscriber queues a replay task, then the primary is disposed in
    // the same tick — the cleared cache must not replay at flush time.
    const late = subscribe(tethered, scheduler)
    primaryDisposable[Symbol.dispose]()

    await settle(20)
    expect(late.capture.values).toEqual([])
  })
})

describe('zip', () => {
  test('emits a fresh object per emission instead of mutating a shared one', async () => {
    const scheduler = createDefaultScheduler()
    let px: ISink<number> | undefined
    let py: ISink<number> | undefined
    const { capture } = subscribe(
      zip({
        x: stream<number>(sink => {
          px = sink
          return disposeNone
        }),
        y: stream<number>(sink => {
          py = sink
          return disposeNone
        })
      }),
      scheduler
    )

    px!.event(0, 1)
    py!.event(0, 10)
    px!.event(0, 2)
    py!.event(0, 20)

    await settle()
    expect(capture.values).toEqual([
      { x: 1, y: 10 },
      { x: 2, y: 20 }
    ])
    expect(capture.values[0]).not.toBe(capture.values[1])
  })
})

describe('synchronously-ending sources', () => {
  const syncEnd = <T>(onDispose?: () => void) =>
    stream<T>(sink => {
      sink.end(0)
      return onDispose ? disposeWith(onDispose) : disposeNone
    })

  test('merge tolerates a source that ends inside run() and disposes its handle', async () => {
    let cleanups = 0
    const { capture } = subscribe(
      merge(
        syncEnd<number>(() => cleanups++),
        just(1)
      )
    )
    await settle(20)
    expect(capture.values).toEqual([1])
    expect(capture.ended).toBe(true)
    expect(cleanups).toBe(1)
  })

  test('combineMap tolerates a source that ends inside run()', async () => {
    const { capture } = subscribe(combineMap((a: number, b: number) => a + b, syncEnd<number>(), just(1)))
    await settle(20)
    expect(capture.values).toEqual([])
    expect(capture.ended).toBe(true)
  })
})

describe('async-ending source disposal', () => {
  const asyncEnd = (onDispose: () => void): IStream<number> =>
    stream<number>(sink => {
      const id = setTimeout(() => sink.end(0), 5)
      return disposeWith(() => {
        clearTimeout(id)
        onDispose()
      })
    })

  test('merge disposes an async-ended source exactly once', async () => {
    let cleanups = 0
    const { capture, dispose } = subscribe(
      merge(
        asyncEnd(() => cleanups++),
        just(1)
      )
    )
    await settle(30)
    expect(capture.ended).toBe(true)
    dispose()
    expect(cleanups).toBe(1)
  })

  test('combineMap disposes an async-ended source exactly once', async () => {
    let cleanups = 0
    const { capture, dispose } = subscribe(
      combineMap(
        (a: number, b: number) => a + b,
        asyncEnd(() => cleanups++),
        just(1)
      )
    )
    await settle(30)
    expect(capture.ended).toBe(true)
    dispose()
    expect(cleanups).toBe(1)
  })
})

describe('applicative error routing', () => {
  test('combineMap routes a callback throw to sink.error and stays live', async () => {
    const scheduler = createDefaultScheduler()
    let pa: ISink<number> | undefined
    let pb: ISink<number> | undefined
    const { capture } = subscribe(
      combineMap(
        (a: number, b: number) => {
          if (a === 1) throw new Error('boom')
          return a + b
        },
        stream<number>(sink => {
          pa = sink
          return disposeNone
        }),
        stream<number>(sink => {
          pb = sink
          return disposeNone
        })
      ),
      scheduler
    )

    pa!.event(0, 1)
    pb!.event(0, 1)
    pa!.event(0, 2)

    await settle()
    expect(capture.errors).toHaveLength(1)
    expect((capture.errors[0] as Error).message).toBe('boom')
    expect(capture.values).toEqual([3])
  })

  test('an error instance that completed fan-out once is not delivered twice', () => {
    const scheduler = createDefaultScheduler()
    let push: ISink<number> | undefined
    const m = multicast(
      stream<number>(sink => {
        push = sink
        return disposeNone
      })
    )

    const seen: unknown[] = []
    m.run(
      {
        event() {},
        end() {},
        error(_, e) {
          seen.push(e)
        }
      },
      scheduler
    )

    const boom = new Error('boom')
    push!.error(0, boom)
    // A guarded scheduler task's error channel can feed the rethrown error
    // back sequentially — the second delivery of the same instance must no-op.
    push!.error(0, boom)

    expect(seen).toHaveLength(1)
  })

  test('multicast delivers errors to every subscriber even if one handler throws', () => {
    const scheduler = createDefaultScheduler()
    let push: ISink<number> | undefined
    const m = multicast(
      stream<number>(sink => {
        push = sink
        return disposeNone
      })
    )

    m.run(
      {
        event() {},
        end() {},
        error() {
          throw new Error('handler boom')
        }
      },
      scheduler
    )
    const second: Capture<number> = { values: [], ended: false, errors: [] }
    m.run(captureSink(second), scheduler)

    expect(() => push!.error(0, new Error('source error'))).toThrow('handler boom')
    expect(second.errors).toHaveLength(1)
    expect((second.errors[0] as Error).message).toBe('source error')
  })

  test('fromPromise routes a downstream throw to sink.error and still ends', async () => {
    const scheduler = createDefaultScheduler()
    let errored: unknown = null
    let ended = false
    fromPromise(Promise.resolve(7)).run(
      {
        event() {
          throw new Error('consumer boom')
        },
        error(_, e) {
          errored = e
        },
        end() {
          ended = true
        }
      },
      scheduler
    )

    await settle(10)
    expect((errored as Error).message).toBe('consumer boom')
    expect(ended).toBe(true)
  })

  test('promiseState routes a downstream throw to sink.error and still ends', async () => {
    const scheduler = createDefaultScheduler()
    const errors: unknown[] = []
    let ended = false
    promiseState(just(Promise.resolve(5))).run(
      {
        event(_, s) {
          if (s.status === PromiseStatus.DONE) throw new Error('consumer boom')
        },
        error(_, e) {
          errors.push(e)
        },
        end() {
          ended = true
        }
      },
      scheduler
    )

    await settle(20)
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('consumer boom')
    expect(ended).toBe(true)
  })
})

describe('tether/behavior termination algebra', () => {
  const pushSource = () => {
    const sinks: ISink<number>[] = []
    const source = stream<number>(sink => {
      sinks.push(sink)
      return disposeNone
    })
    return { source, sinks }
  }

  test('one ended primary does not end the tether while others are live', () => {
    const scheduler = createDefaultScheduler()
    const { source, sinks } = pushSource()
    const [primary, tethered] = tether(source)

    const tetherCapture: Capture<number> = { values: [], ended: false, errors: [] }
    tethered.run(captureSink(tetherCapture), scheduler)

    const consume: Capture<number> = { values: [], ended: false, errors: [] }
    primary.run(captureSink(consume), scheduler)
    primary.run(captureSink(consume), scheduler)

    sinks[0].event(0, 1)
    sinks[0].end(0)
    expect(tetherCapture.ended).toBe(false)

    sinks[1].event(0, 2)
    expect(tetherCapture.values).toEqual([1, 2])

    sinks[1].end(0)
    expect(tetherCapture.ended).toBe(true)
  })

  test('a disposed primary is cancellation, not completion', () => {
    const scheduler = createDefaultScheduler()
    const { source } = pushSource()
    const [primary, tethered] = tether(source)

    const tetherCapture: Capture<number> = { values: [], ended: false, errors: [] }
    tethered.run(captureSink(tetherCapture), scheduler)

    const d = primary.run(captureSink({ values: [], ended: false, errors: [] }), scheduler)
    d[Symbol.dispose]()

    expect(tetherCapture.ended).toBe(false)
  })

  test('a behavior consumer ends only after all samplers end', () => {
    const scheduler = createDefaultScheduler()
    const [out, compose] = behavior<number>()
    const a = pushSource()
    const b = pushSource()

    const consumer: Capture<number> = { values: [], ended: false, errors: [] }
    out.run(captureSink(consumer), scheduler)

    const sA = compose()(a.source)
    const sB = compose()(b.source)
    sA.run(nullSink, scheduler)
    sB.run(nullSink, scheduler)

    a.sinks[0].event(0, 1)
    a.sinks[0].end(0)
    expect(consumer.ended).toBe(false)

    b.sinks[0].event(0, 2)
    expect(consumer.values).toEqual([1, 2])

    b.sinks[0].end(0)
    expect(consumer.ended).toBe(true)
  })

  test('unmounting a composed view revokes its sampler registration', () => {
    const scheduler = createDefaultScheduler()
    const [out, compose] = behavior<number>()
    let probeRuns = 0
    const probe = (s: IStream<number>): IStream<number> => ({
      run(sink, sch) {
        probeRuns++
        return s.run(sink, sch)
      }
    })

    // three remount generations, each fully unmounted again
    for (let i = 0; i < 3; i++) {
      const s0 = compose(probe)(stream<number>(() => disposeNone))
      const d = s0.run(nullSink, scheduler)
      d[Symbol.dispose]()
    }
    expect(probeRuns).toBe(0)

    // a fresh consumer must not be wired to the dead samplers
    out.run(nullSink, scheduler)
    expect(probeRuns).toBe(0)

    // positive control: a LIVE mount registers, and the existing consumer is
    // hot-wired through the probe
    const { source, sinks } = pushSource()
    const live = compose(probe)(source)
    live.run(nullSink, scheduler)
    expect(probeRuns).toBe(1)

    const consumer: Capture<number> = { values: [], ended: false, errors: [] }
    out.run(captureSink(consumer), scheduler)
    expect(probeRuns).toBe(2)

    sinks[0].event(0, 7)
    expect(consumer.values).toEqual([7])
  })

  test('an end arriving after disposal does not double-count the contributor', () => {
    const scheduler = createDefaultScheduler()
    const { source, sinks } = pushSource()
    const [primary, tethered] = tether(source)

    const tetherCapture: Capture<number> = { values: [], ended: false, errors: [] }
    tethered.run(captureSink(tetherCapture), scheduler)

    const dA = primary.run(captureSink({ values: [], ended: false, errors: [] }), scheduler)
    primary.run(captureSink({ values: [], ended: false, errors: [] }), scheduler)

    dA[Symbol.dispose]()
    // contract-violating late end from the disposed subscription's source
    sinks[0].end(0)
    expect(tetherCapture.ended).toBe(false)

    sinks[1].event(0, 5)
    expect(tetherCapture.values).toEqual([5])

    sinks[1].end(0)
    expect(tetherCapture.ended).toBe(true)
  })

  test('double-disposing a primary subscription does not corrupt the live count', () => {
    const scheduler = createDefaultScheduler()
    const { source, sinks } = pushSource()
    const [primary, tethered] = tether(source)

    const tetherCapture: Capture<number> = { values: [], ended: false, errors: [] }
    tethered.run(captureSink(tetherCapture), scheduler)

    const dA = primary.run(captureSink({ values: [], ended: false, errors: [] }), scheduler)
    primary.run(captureSink({ values: [], ended: false, errors: [] }), scheduler)

    dA[Symbol.dispose]()
    dA[Symbol.dispose]()
    expect(tetherCapture.ended).toBe(false)

    sinks[1].end(0)
    expect(tetherCapture.ended).toBe(true)
  })

  test('double-disposing a composed mount does not desync sampler registration', () => {
    const scheduler = createDefaultScheduler()
    const [out, compose] = behavior<number>()

    const consumer: Capture<number> = { values: [], ended: false, errors: [] }
    out.run(captureSink(consumer), scheduler)

    const a = pushSource()
    const composed = compose()(a.source)
    const d1 = composed.run(nullSink, scheduler)
    d1[Symbol.dispose]()
    d1[Symbol.dispose]()

    // remount: the 0→1 registration edge must fire again
    const b = pushSource()
    // a fresh application simulating a remount generation
    const composed2 = compose()(b.source)
    composed2.run(nullSink, scheduler)
    b.sinks[0].event(0, 9)
    expect(consumer.values).toEqual([9])
  })

  test('a throwing source rolls back the registration and the contributor count', () => {
    const scheduler = createDefaultScheduler()
    const [out, compose] = behavior<number>()

    let attempts = 0
    const { source, sinks } = pushSource()
    const flaky: IStream<number> = {
      run(sink, sch) {
        if (attempts++ === 0) throw new Error('subscribe failed')
        return source.run(sink, sch)
      }
    }

    const composed = compose()(flaky)
    expect(() => composed.run(nullSink, scheduler)).toThrow('subscribe failed')

    // rollback must leave the behavior consistent: the retry registers cleanly
    const consumer: Capture<number> = { values: [], ended: false, errors: [] }
    out.run(captureSink(consumer), scheduler)
    composed.run(nullSink, scheduler)
    sinks[0].event(0, 3)
    expect(consumer.values).toEqual([3])
    sinks[0].end(0)
    expect(consumer.ended).toBe(true)
  })

  test('a consumer subscribed before any sampler exists is hot-wired on mount', () => {
    const scheduler = createDefaultScheduler()
    const [out, compose] = behavior<number>()

    const consumer: Capture<number> = { values: [], ended: false, errors: [] }
    out.run(captureSink(consumer), scheduler)

    const { source, sinks } = pushSource()
    compose()(source).run(nullSink, scheduler)

    sinks[0].event(0, 42)
    expect(consumer.values).toEqual([42])
  })
})

describe('sample', () => {
  test('disposes the values subscription exactly once', async () => {
    const scheduler = createDefaultScheduler()
    let cleanups = 0
    const values = stream<number>(() => disposeWith(() => cleanups++))

    // just() ends the sampler, which disposes the values subscription; the
    // outer dispose must not run the cleanup a second time.
    const { capture, dispose } = subscribe(sample(values, just(1)), scheduler)
    await settle(10)
    expect(capture.ended).toBe(true)
    dispose()
    expect(cleanups).toBe(1)
  })
})

describe('error feedback cycle', () => {
  test('a fault re-entering a shared node through a feedback edge reports once instead of recursing', () => {
    const scheduler = createDefaultScheduler()
    let upstream: ISink<number> | null = null
    const shared = multicast(
      stream<number>(sink => {
        upstream = sink
        return disposeNone
      })
    )
    const seen: unknown[] = []
    const feedback: ISink<number> = {
      event() {},
      end() {},
      error(time: ITime, e: unknown) {
        seen.push(e)
        upstream?.error(time, e as Error)
      }
    }

    shared.run(feedback, scheduler)
    const fault = new Error('502')
    expect(() => upstream?.error(scheduler.time(), fault)).not.toThrow()
    expect(seen).toEqual([fault])
  })
})
