// Bench switchLatest and switchMap against @most/core to find optimization
// opportunities. Runs each workload through:
//   aelea-SL = switchLatest only
//   aelea-SM = switchMap(cb)         (curried wrapper)
//   aelea-COMP = switchLatest(map(cb))  (manual composition, what SM does internally)
//   most       = MC.switchLatest(MC.map(cb))
//
// If aelea-SM is meaningfully slower than aelea-COMP, that's the curry+barrel
// overhead; if both lose to most, the loss is in switchLatest itself.
//
// Workloads:
//   1. inner-heavy: outer emits ~10 streams, each emits ~100k. Hot path = inner.
//   2. outer-heavy: outer emits ~50k streams of size 1. Hot path = subscribe/dispose.
//   3. switchMap-stream:   outer emits 10k values, cb maps each → tiny stream.
//   4. switchMap-promise:  outer emits 1k values, cb maps each → resolved Promise.

import * as MC from '@most/core'
import { Bench } from 'tinybench'
import { fromIterable, type IStream, just, map, op, reduce, switchLatest, switchMap } from '../src/stream/index.js'
import { fromArrayM, runMost, runStream } from './utils.js'

const sum = (a: number, b: number) => a + b

const bench = new Bench({
  name: 'switchLatest / switchMap',
  time: 500,
  warmupTime: 250,
  throws: true
})

// ─── 1. inner-heavy: 10 outer × 100k inner ────────────────────────────────────
{
  const arr = Array.from({ length: 10 }, () => Array.from({ length: 100_000 }, (_, i) => i))

  bench.add('aelea-SL inner-heavy 10×100k', () =>
    runStream(op(fromIterable(arr), map(fromIterable), switchLatest, reduce(sum, 0)))
  )
  bench.add('aelea-SM inner-heavy 10×100k', () =>
    runStream(op(fromIterable(arr), switchMap(fromIterable), reduce(sum, 0)))
  )
  bench.add('most     inner-heavy 10×100k', () =>
    runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(fromArrayM, fromArrayM(arr)))))
  )
}

// ─── 2. outer-heavy: 50k outer × 1 inner ──────────────────────────────────────
{
  const arr = Array.from({ length: 50_000 }, () => [0])

  bench.add('aelea-SL outer-heavy 50k×1', () =>
    runStream(op(fromIterable(arr), map(fromIterable), switchLatest, reduce(sum, 0)))
  )
  bench.add('aelea-SM outer-heavy 50k×1', () =>
    runStream(op(fromIterable(arr), switchMap(fromIterable), reduce(sum, 0)))
  )
  bench.add('most     outer-heavy 50k×1', () =>
    runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(fromArrayM, fromArrayM(arr)))))
  )
}

// ─── 3. switchMap-stream: 10k outer values, each → just(value*2) ──────────────
{
  const outerArr = Array.from({ length: 10_000 }, (_, i) => i)
  const toStream = (i: number): IStream<number> => just(i * 2)
  const toMostStream = (i: number) => MC.now(i * 2)

  bench.add('aelea-SM   10k → just', () => runStream(op(fromIterable(outerArr), switchMap(toStream), reduce(sum, 0))))
  // Manual composition without the isStream/fromPromise wrap: the lower
  // bound, since switchMap pays for the wrap on every emit.
  bench.add('aelea-COMP 10k → just', () =>
    runStream(op(fromIterable(outerArr), map(toStream), switchLatest, reduce(sum, 0)))
  )
  bench.add('most     10k → now', () =>
    runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(toMostStream, fromArrayM(outerArr)))))
  )
}

// ─── 4. switchMap-promise: 1k outer values, each → Promise.resolve() ─────────
{
  const outerArr = Array.from({ length: 1_000 }, (_, i) => i)
  const toPromise = (i: number) => Promise.resolve(i * 2)
  // most's idiomatic: awaitPromises(map(toPromise))
  const toMostPromise = (i: number) => MC.now(i * 2) // most needs streams

  bench.add('aelea-SM 1k → Promise', () => runStream(op(fromIterable(outerArr), switchMap(toPromise), reduce(sum, 0))))
  // No fair most comparison for promise path (most has fromPromise + switchLatest);
  // include the "resolved promise via fromPromise" path for context.
  bench.add('most     1k → now (no promise wrap)', () =>
    runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(toMostPromise, fromArrayM(outerArr)))))
  )
}

await bench.run()

console.table(
  bench.table(task => {
    const r = task.result
    if (r === undefined) return { name: task.name, status: 'no result' }
    return {
      name: task.name,
      'med µs': Math.round((r.latency.p50 ?? r.latency.mean) * 1000),
      'avg µs': Math.round(r.latency.mean * 1000),
      'ops/s': Math.round(r.throughput.mean),
      'rsd %': Number((r.latency.rme ?? 0).toFixed(2)),
      samples: task.runs
    }
  })
)
