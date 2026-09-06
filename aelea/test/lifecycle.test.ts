import { describe, expect, test } from 'bun:test'
import {
  at,
  awaitPromises,
  continueWith,
  createDefaultScheduler,
  debounce,
  disposeNone,
  disposeWith,
  fromIterable,
  fromPromise,
  type ISink,
  type IStream,
  joinConcurrently,
  just,
  merge,
  never,
  nowWith,
  nullSink,
  periodic,
  reduce,
  sampleMap,
  since,
  switchLatest,
  until,
  zip
} from '../src/stream/index.js'
import { behavior, multicast, state, stream, tether } from '../src/stream-extended/index.js'

interface Capture<T> {
  values: T[]
  ends: number
  errors: unknown[]
}

const capture = <T>(): Capture<T> => ({ values: [], ends: 0, errors: [] })

const sinkOf = <T>(c: Capture<T>): ISink<T> => ({
  event(_, value) {
    c.values.push(value)
  },
  error(_, err) {
    c.errors.push(err)
  },
  end() {
    c.ends++
  }
})

const settle = (ms = 10): Promise<void> => new Promise(r => setTimeout(r, ms))

const pushSource = <T>() => {
  let sink: ISink<T> | undefined
  const source = stream<T>(s => {
    sink = s
    return disposeNone
  })
  return { source, push: () => sink! }
}

const tracked = <T>(counter: { disposed: number }): IStream<T> => stream<T>(() => disposeWith(() => counter.disposed++))

describe('end releases what a stream holds', () => {
  test('zip ends once and releases the other sources when a source ends with nothing to pair', () => {
    const scheduler = createDefaultScheduler()
    const a = pushSource<number>()
    const other = { disposed: 0 }
    const c = capture<{ a: number; b: number }>()
    zip({ a: a.source, b: tracked<number>(other) }).run(sinkOf(c), scheduler)

    a.push().end(0)
    expect(c.ends).toBe(1)
    expect(other.disposed).toBe(1)
  })

  test('until ends once and releases the signal when the source ends', () => {
    const scheduler = createDefaultScheduler()
    const src = pushSource<number>()
    const sig = pushSource<number>()
    const signal = { disposed: 0 }
    const c = capture<number>()
    until(
      stream<number>(sink => {
        sig.source.run(sink, scheduler)
        return disposeWith(() => signal.disposed++)
      }),
      src.source
    ).run(sinkOf(c), scheduler)

    src.push().end(0)
    expect(signal.disposed).toBe(1)
    sig.push().event(0, 1)
    expect(c.ends).toBe(1)
  })

  test('since releases the signal when the source ends before it fires', () => {
    const scheduler = createDefaultScheduler()
    const src = pushSource<number>()
    const signal = { disposed: 0 }
    since(tracked<number>(signal), src.source).run(nullSink, scheduler)

    src.push().end(0)
    expect(signal.disposed).toBe(1)
  })

  test('switchLatest releases an inner that ends', () => {
    const scheduler = createDefaultScheduler()
    const signal = { disposed: 0 }
    const innerSrc = pushSource<number>()
    const inner = until(tracked<number>(signal), innerSrc.source)
    const outer = pushSource<IStream<number>>()
    switchLatest(outer.source).run(nullSink, scheduler)

    outer.push().event(0, inner)
    innerSrc.push().end(0)
    expect(signal.disposed).toBe(1)
  })

  test('continueWith releases the ended source before running the continuation', async () => {
    const scheduler = createDefaultScheduler()
    const source = { disposed: 0 }
    const c = capture<number>()
    continueWith(
      () => just(2),
      stream<number>(sink => {
        queueMicrotask(() => sink.end(0))
        return disposeWith(() => source.disposed++)
      })
    ).run(sinkOf(c), scheduler)

    await settle()
    expect(source.disposed).toBe(1)
    expect(c.values).toEqual([2])
    expect(c.ends).toBe(1)
  })

  test('periodic does not re-arm after being disposed inside its own event', async () => {
    const scheduler = createDefaultScheduler()
    const seen: number[] = []
    let disposable: Disposable = disposeNone
    disposable = periodic(5).run(
      {
        event(_, t) {
          seen.push(t)
          disposable[Symbol.dispose]()
        },
        error() {},
        end() {}
      },
      scheduler
    )

    await settle(30)
    expect(seen).toHaveLength(1)
  })
})

describe('shared streams close when their source ends', () => {
  test('state over an ended source replays the final value then ends', async () => {
    const scheduler = createDefaultScheduler()
    let runs = 0
    const s = state()(
      stream<number>(sink => {
        runs++
        return just(1).run(sink, scheduler)
      })
    )

    const first = capture<number>()
    s.run(sinkOf(first), scheduler)
    await settle()
    const late = capture<number>()
    s.run(sinkOf(late), scheduler)
    await settle()

    expect(first.values).toEqual([1])
    expect(late.values).toEqual([1])
    expect(late.ends).toBe(1)
    expect(runs).toBe(1)
  })

  test('multicast over an ended source ends late subscribers instead of re-running', async () => {
    const scheduler = createDefaultScheduler()
    const m = multicast(just(1))
    m.run(nullSink, scheduler)
    await settle()

    const late = capture<number>()
    m.run(sinkOf(late), scheduler)
    await settle()
    expect(late.values).toEqual([])
    expect(late.ends).toBe(1)
  })

  test('multicast re-runs a source that was cancelled by disposal', async () => {
    const scheduler = createDefaultScheduler()
    let runs = 0
    const m = multicast(
      stream<number>(() => {
        runs++
        return disposeNone
      })
    )
    const d = m.run(nullSink, scheduler)
    d[Symbol.dispose]()
    m.run(nullSink, scheduler)
    expect(runs).toBe(2)
  })

  test('multicast rolls back a throwing first run so the next subscriber starts the source', () => {
    const scheduler = createDefaultScheduler()
    let attempts = 0
    const m = multicast(
      stream<number>(sink => {
        if (attempts++ === 0) throw new Error('subscribe failed')
        sink.event(0, 1)
        return disposeNone
      })
    )

    expect(() => m.run(nullSink, scheduler)).toThrow('subscribe failed')
    const c = capture<number>()
    m.run(sinkOf(c), scheduler)
    expect(c.values).toEqual([1])
  })

  test('tether closes after its last primary ends and does not replay ended primaries', async () => {
    const scheduler = createDefaultScheduler()
    const [primary, tethered] = tether(just(1))
    const p = capture<number>()
    primary.run(sinkOf(p), scheduler)
    await settle()
    expect(p.ends).toBe(1)

    const late = capture<number>()
    tethered.run(sinkOf(late), scheduler)
    await settle()
    expect(late.values).toEqual([])
    expect(late.ends).toBe(1)
  })

  test('a behavior consumer ends and releases its wires when its last sampler ends', async () => {
    const scheduler = createDefaultScheduler()
    const [out, compose] = behavior<number>()
    const consumer = capture<number>()
    out.run(sinkOf(consumer), scheduler)

    compose()(just(1)).run(nullSink, scheduler)
    await settle()

    expect(consumer.values).toEqual([1])
    expect(consumer.ends).toBe(1)
  })
})

describe('applicative errors and terminal failures', () => {
  test('reduce emits the seed before a synchronous first value', async () => {
    const scheduler = createDefaultScheduler()
    const c = capture<number>()
    reduce(
      (a: number, b: number) => a + b,
      0,
      stream<number>(sink => {
        sink.event(0, 5)
        return disposeNone
      })
    ).run(sinkOf(c), scheduler)

    await settle()
    expect(c.values).toEqual([0, 5])
  })

  test('debounce keeps the pending value across an applicative error', async () => {
    const scheduler = createDefaultScheduler()
    const src = pushSource<string>()
    const c = capture<string>()
    debounce(10, src.source).run(sinkOf(c), scheduler)

    src.push().event(0, 'a')
    src.push().error(0, new Error('transient'))
    await settle(40)
    expect(c.errors).toHaveLength(1)
    expect(c.values).toEqual(['a'])
  })

  test('one-shot sources report a consumer throw on the error channel and still end', async () => {
    const scheduler = createDefaultScheduler()
    const sources: [string, IStream<unknown>][] = [
      ['just', just(1)],
      ['fromIterable', fromIterable([1])],
      ['nowWith', nowWith(() => 1)],
      ['fromPromise', fromPromise(Promise.resolve(1))]
    ]
    for (const [name, source] of sources) {
      const c = capture<unknown>()
      source.run(
        {
          event() {
            throw new Error(`consumer ${name}`)
          },
          error(_, e) {
            c.errors.push(e)
          },
          end() {
            c.ends++
          }
        },
        scheduler
      )
      await settle()
      expect([name, c.errors.length, c.ends]).toEqual([name, 1, 1])
    }
  })

  test('fromIterable continues past a consumer throw and fails terminally on an iterator throw', async () => {
    const scheduler = createDefaultScheduler()
    const consumer = capture<number>()
    fromIterable([1, 2, 3]).run(
      {
        event(_, v) {
          if (v === 2) throw new Error('consumer')
          consumer.values.push(v)
        },
        error(_, e) {
          consumer.errors.push(e)
        },
        end() {
          consumer.ends++
        }
      },
      scheduler
    )

    function* failing() {
      yield 1
      throw new Error('iterator')
    }
    const iterator = capture<number>()
    fromIterable(failing()).run(sinkOf(iterator), scheduler)

    await settle()
    expect(consumer.values).toEqual([1, 3])
    expect(consumer.errors).toHaveLength(1)
    expect(consumer.ends).toBe(1)
    expect(iterator.values).toEqual([1])
    expect(iterator.errors).toHaveLength(1)
    expect(iterator.ends).toBe(1)
  })

  test('at with a target already in the past emits on the next tick', async () => {
    const scheduler = createDefaultScheduler()
    const c = capture<number>()
    at(scheduler.time() - 5).run(sinkOf(c), scheduler)
    await settle()
    expect(c.values).toHaveLength(1)
    expect(c.ends).toBe(1)
  })

  test('switchLatest reports an inner that fails to start and still ends', () => {
    const scheduler = createDefaultScheduler()
    const outer = pushSource<IStream<number>>()
    const c = capture<number>()
    switchLatest(outer.source).run(sinkOf(c), scheduler)

    outer.push().event(0, {
      run() {
        throw new Error('inner boom')
      }
    })
    outer.push().end(0)
    expect(c.errors).toHaveLength(1)
    expect(c.ends).toBe(1)
  })

  test('join reports an inner that fails to start, frees its slot, and still ends', async () => {
    const scheduler = createDefaultScheduler()
    const outer = pushSource<IStream<number>>()
    const c = capture<number>()
    joinConcurrently(1, outer.source).run(sinkOf(c), scheduler)

    outer.push().event(0, {
      run() {
        throw new Error('inner boom')
      }
    })
    outer.push().event(0, just(2))
    outer.push().end(0)
    await settle()
    expect(c.errors).toHaveLength(1)
    expect(c.values).toEqual([2])
    expect(c.ends).toBe(1)
  })

  test('awaitPromises keeps an error in its source slot', async () => {
    const scheduler = createDefaultScheduler()
    const src = pushSource<Promise<number>>()
    const log: string[] = []
    awaitPromises(src.source).run(
      {
        event(_, v) {
          log.push(`value:${v}`)
        },
        error() {
          log.push('error')
        },
        end() {
          log.push('end')
        }
      },
      scheduler
    )

    src.push().event(0, new Promise(r => setTimeout(() => r(1), 15)))
    src.push().error(0, new Error('mid'))
    src.push().event(0, Promise.resolve(2))
    src.push().end(0)
    await settle(40)
    expect(log).toEqual(['value:1', 'error', 'value:2', 'end'])
  })
})

describe('errors never cross a tether', () => {
  test('a state fed back by a tethered async derivation of itself delivers a seeded error once', async () => {
    const scheduler = createDefaultScheduler()
    const seed = pushSource<number>()
    const [change, changeTether] = behavior<number>()
    const root = state(
      0,
      reduce((acc: number, x: number) => acc + x, 0, merge(seed.source, change))
    )
    const childOutput = awaitPromises(sampleMap((v: number) => Promise.resolve(v), root, never))
    const primary = changeTether()(childOutput)

    const rootSeen = capture<number>()
    const primarySeen = capture<number>()
    root.run(sinkOf(rootSeen), scheduler)
    primary.run(sinkOf(primarySeen), scheduler)
    await settle()

    seed.push().error(0, new Error('seed'))
    await settle(50)

    expect(rootSeen.errors).toHaveLength(1)
    expect(primarySeen.errors).toHaveLength(1)
  })

  test('an error on the primary source reaches the primary sink, not the tether', () => {
    const scheduler = createDefaultScheduler()
    const src = pushSource<number>()
    const [primary, tethered] = tether(src.source)
    const p = capture<number>()
    const t = capture<number>()
    primary.run(sinkOf(p), scheduler)
    tethered.run(sinkOf(t), scheduler)

    src.push().event(0, 1)
    src.push().error(0, new Error('upstream'))
    expect(p.values).toEqual([1])
    expect(t.values).toEqual([1])
    expect(p.errors).toHaveLength(1)
    expect(t.errors).toHaveLength(0)
  })
})
