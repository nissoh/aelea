// Scheduler-focused benchmark: workloads that exercise asap/delay paths.
// Compares the current src/ scheduler (AFTER) against an inlined pre-metal-opts
// version (BEFORE) and @most/core (cross-library context).

import * as MC from '@most/core'
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
} from '../../src/stream/index.js'
import { BrowserScheduler } from '../../src/stream/scheduler/BrowserScheduler.js'
import { fromArrayM, runMost } from '../lib/runtime.js'
import { type IBenchTask, type ISuite, runAndPrint } from '../lib/suite.js'

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

const beforeScheduler: IScheduler = new BeforeScheduler()
const afterScheduler: IScheduler = new BrowserScheduler()

const runWith =
  (scheduler: IScheduler) =>
  <T>(stream: IStream<T>): Promise<T> =>
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

const runBefore = runWith(beforeScheduler)
const runAfter = runWith(afterScheduler)

const sum = (a: number, b: number) => a + b

const tasks: IBenchTask[] = []

// 1. minimal pipeline
tasks.push(
  { group: 'just → reduce', variant: 'BEFORE', baseline: true, fn: () => runBefore(op(justAfter(42), reduce(sum, 0))) },
  { group: 'just → reduce', variant: 'AFTER', fn: () => runAfter(op(justAfter(42), reduce(sum, 0))) },
  { group: 'just → reduce', variant: '@most now', fn: () => runMost(MC.scan(sum, 0, MC.now(42))) }
)

// 2. control: pipeline throughput (scheduler incidental)
{
  const arr = Array.from({ length: 10_000 }, (_, i) => i)
  const pipe = (): IStream<number> =>
    op(
      fromIterable(arr),
      map(x => x * 2),
      filter(x => x % 3 === 0),
      reduce(sum, 0)
    )
  tasks.push(
    { group: 'fromIter pipe 10k', variant: 'BEFORE', baseline: true, fn: () => runBefore(pipe()) },
    { group: 'fromIter pipe 10k', variant: 'AFTER', fn: () => runAfter(pipe()) },
    {
      group: 'fromIter pipe 10k',
      variant: '@most',
      fn: () =>
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
    }
  )
}

// 3. burst — stresses asap flush
const N = 100
tasks.push(
  {
    group: `${N} just burst`,
    variant: 'BEFORE',
    baseline: true,
    fn: () => Promise.all(Array.from({ length: N }, (_, i) => runBefore(justAfter(i))))
  },
  {
    group: `${N} just burst`,
    variant: 'AFTER',
    fn: () => Promise.all(Array.from({ length: N }, (_, i) => runAfter(justAfter(i))))
  },
  {
    group: `${N} just burst`,
    variant: '@most now',
    fn: () => Promise.all(Array.from({ length: N }, (_, i) => runMost(MC.now(i))))
  }
)

// 4. burst — delay path
tasks.push(
  {
    group: `${N} at(0) burst`,
    variant: 'BEFORE',
    baseline: true,
    fn: () => Promise.all(Array.from({ length: N }, () => runBefore(atAfter(0))))
  },
  {
    group: `${N} at(0) burst`,
    variant: 'AFTER',
    fn: () => Promise.all(Array.from({ length: N }, () => runAfter(atAfter(0))))
  },
  {
    group: `${N} at(0) burst`,
    variant: '@most at',
    fn: () => Promise.all(Array.from({ length: N }, (_, i) => runMost(MC.at(0, i))))
  }
)

const suite: ISuite = {
  title: 'scheduler',
  subtitle: 'BEFORE = pre-metal-opts · AFTER = current src/',
  options: { time: 500, warmupTime: 250 },
  tasks
}

export default suite

if (import.meta.main) await runAndPrint(suite)
