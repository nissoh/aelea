// Scheduler-focused benchmark: workloads that exercise asap/delay paths.
//
// Compares THREE scheduler implementations on the same stream pipelines:
//   BEFORE — the pre-metal-opts version (asapCancelled flag, fresh array
//            per flush, time() call per task), inlined here for A/B.
//   AFTER  — current src/ scheduler (no asapCancelled, recycled array,
//            time() cached once per flush).
//   most   — @most/core's defaultScheduler, for cross-library context.
//
// Workloads:
//   1. `just→reduce`: minimal pipeline, asap touched once per iteration.
//   2. `fromIter→m→f→reduce 10k`: asap once + sync hot loop. Mostly tests
//      combinator throughput, not scheduler — control case.
//   3. `100 just-subscribes burst`: 100 asaps in one sync block, all coalesce
//      into a single flush. THE test for the asap-flush optimizations.
//   4. `100 at(0) burst`: 100 setTimeout(0)s flushed by host. Tests the
//      delay path (less affected by changes since runDelayedTask is per-task).

import * as MC from '@most/core'
import { Bench } from 'tinybench'
import {
  at as atAfter,
  filter,
  fromIterable,
  type IScheduler,
  type ISink,
  type IStream,
  type ITask,
  type ITime,
  just as justAfter,
  map,
  op,
  reduce
} from '../src/stream/index.js'
import { BrowserScheduler } from '../src/stream/scheduler/BrowserScheduler.js'
import { fromArrayM, runMost } from './utils.js'

// ─── BEFORE: pre-metal-opts BrowserScheduler, inlined ────────────────────────
class BeforeScheduler implements IScheduler {
  private asapTasks: ITask[] = []
  private asapScheduled = false
  private asapCancelled = false
  private readonly initialTime = performance.now()
  private readonly initialWallClockTime = Date.now()

  runDelayedTask = (task: ITask): void => {
    if (this.asapScheduled) {
      this.asapCancelled = true
      this.flushAsapTasks()
    }
    task.run(this.time())
  }

  flushAsapTasks = (): void => {
    if (this.asapCancelled) {
      this.asapCancelled = false
      return
    }
    this.asapScheduled = false
    const tasks = this.asapTasks
    this.asapTasks = []
    for (let i = 0; i < tasks.length; i++) tasks[i].run(this.time())
  }

  asap(task: ITask): Disposable {
    this.asapTasks.push(task)
    if (!this.asapScheduled) {
      this.asapScheduled = true
      queueMicrotask(this.flushAsapTasks)
    }
    return task
  }

  delay(task: ITask, delay: ITime): Disposable {
    setTimeout(this.runDelayedTask, delay, task)
    return task
  }

  time(): ITime {
    return performance.now() - this.initialTime
  }

  dayTime(): ITime {
    return this.initialWallClockTime + this.time()
  }
}

// ─── Wiring helpers ──────────────────────────────────────────────────────────
// Pin both to queueMicrotask-based schedulers so we measure the asap-flush
// changes, not setImmediate-vs-microtask differences.
const beforeScheduler: IScheduler = new BeforeScheduler()
const afterScheduler: IScheduler = new BrowserScheduler()

const runWith =
  <T>(scheduler: IScheduler) =>
  (stream: IStream<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      let result!: T
      const sink: ISink<T> = {
        event(_, v) {
          result = v
        },
        error(_, e) {
          reject(e)
        },
        end() {
          resolve(result)
        }
      }
      stream.run(sink, scheduler)
    })

const runBefore = runWith
const runAfter = runWith

const sum = (a: number, b: number) => a + b

const bench = new Bench({
  name: 'scheduler',
  time: 500,
  warmupTime: 250,
  throws: true
})

// 1) Minimal pipeline: asap touched once per iteration.
bench.add('AFTER  just→reduce', () => runAfter<number>(afterScheduler)(op(justAfter(42), reduce(sum, 0))))
bench.add('BEFORE just→reduce', () => runBefore<number>(beforeScheduler)(op(justAfter(42), reduce(sum, 0))))
bench.add('most   now→reduce', () => runMost(MC.scan(sum, 0, MC.now(42))))

// 2) Pipeline throughput (control): scheduler incidental.
const arr = Array.from({ length: 10_000 }, (_, i) => i)
const pipeline = (): IStream<number> =>
  op(
    fromIterable(arr),
    map(x => x * 2),
    filter(x => x % 3 === 0),
    reduce(sum, 0)
  )
bench.add('AFTER  fromIter pipe 10k', () => runAfter<number>(afterScheduler)(pipeline()))
bench.add('BEFORE fromIter pipe 10k', () => runBefore<number>(beforeScheduler)(pipeline()))
bench.add('most   fromArray pipe 10k', () =>
  runMost(
    MC.scan(
      sum,
      0,
      MC.filter(
        (x: number) => x % 3 === 0,
        MC.map((x: number) => x * 2, fromArrayM(arr))
      )
    )
  )
)

// 3) Burst of N just-subscribes: stresses asap flush (alloc, time() per task).
const N = 100
bench.add(`AFTER  ${N} just burst`, () => {
  const ps = new Array(N)
  for (let i = 0; i < N; i++) ps[i] = runAfter<number>(afterScheduler)(justAfter(i))
  return Promise.all(ps)
})
bench.add(`BEFORE ${N} just burst`, () => {
  const ps = new Array(N)
  for (let i = 0; i < N; i++) ps[i] = runBefore<number>(beforeScheduler)(justAfter(i))
  return Promise.all(ps)
})
bench.add(`most   ${N} now burst`, () => {
  const ps = new Array(N)
  for (let i = 0; i < N; i++) ps[i] = runMost(MC.now(i))
  return Promise.all(ps)
})

// 4) Burst of N at(0): stresses delay path (setTimeout coalescing by host).
bench.add(`AFTER  ${N} at(0) burst`, () => {
  const ps = new Array(N)
  for (let i = 0; i < N; i++) ps[i] = runAfter<number>(afterScheduler)(atAfter(0))
  return Promise.all(ps)
})
bench.add(`BEFORE ${N} at(0) burst`, () => {
  const ps = new Array(N)
  for (let i = 0; i < N; i++) ps[i] = runBefore<number>(beforeScheduler)(atAfter(0))
  return Promise.all(ps)
})
bench.add(`most   ${N} at(0) burst`, () => {
  const ps = new Array(N)
  for (let i = 0; i < N; i++) ps[i] = runMost(MC.at(0, i))
  return Promise.all(ps)
})

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
