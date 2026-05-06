// Bench switchLatest and switchMap against @most/core to find optimization
// opportunities. Workloads:
//   1. inner-heavy:        outer 10  × inner 100k       — inner hot path
//   2. outer-heavy:        outer 50k × inner 1          — subscribe/dispose hot path
//   3. switchMap-stream:   outer 10k → just(v*2)        — wrap-on-emit overhead
//   4. switchMap-promise:  outer 1k  → Promise.resolve  — no fair @most parity

import * as MC from '@most/core'
import { fromIterable, type IStream, just, map, op, reduce, switchLatest, switchMap } from '../../src/stream/index.js'
import { fromArrayM, runMost, runStream } from '../lib/runtime.js'
import { type IBenchTask, type ISuite, runAndPrint } from '../lib/suite.js'

const sum = (a: number, b: number) => a + b

const tasks: IBenchTask[] = []

// 1. inner-heavy
{
  const arr = Array.from({ length: 10 }, () => Array.from({ length: 100_000 }, (_, i) => i))
  tasks.push(
    {
      group: 'inner-heavy 10×100k',
      variant: '@most',
      baseline: true,
      fn: () => runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(fromArrayM, fromArrayM(arr)))))
    },
    {
      group: 'inner-heavy 10×100k',
      variant: '@aelea switchLatest',
      fn: () => runStream(op(fromIterable(arr), map(fromIterable), switchLatest, reduce(sum, 0)))
    },
    {
      group: 'inner-heavy 10×100k',
      variant: '@aelea switchMap',
      fn: () => runStream(op(fromIterable(arr), switchMap(fromIterable), reduce(sum, 0)))
    }
  )
}

// 2. outer-heavy
{
  const arr = Array.from({ length: 50_000 }, () => [0])
  tasks.push(
    {
      group: 'outer-heavy 50k×1',
      variant: '@most',
      baseline: true,
      fn: () => runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(fromArrayM, fromArrayM(arr)))))
    },
    {
      group: 'outer-heavy 50k×1',
      variant: '@aelea switchLatest',
      fn: () => runStream(op(fromIterable(arr), map(fromIterable), switchLatest, reduce(sum, 0)))
    },
    {
      group: 'outer-heavy 50k×1',
      variant: '@aelea switchMap',
      fn: () => runStream(op(fromIterable(arr), switchMap(fromIterable), reduce(sum, 0)))
    }
  )
}

// 3. switchMap-stream
{
  const outerArr = Array.from({ length: 10_000 }, (_, i) => i)
  const toStream = (i: number): IStream<number> => just(i * 2)
  const toMostStream = (i: number) => MC.now(i * 2)
  tasks.push(
    {
      group: '10k → just',
      variant: '@most',
      baseline: true,
      fn: () => runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(toMostStream, fromArrayM(outerArr)))))
    },
    {
      group: '10k → just',
      variant: '@aelea switchLatest∘map',
      fn: () => runStream(op(fromIterable(outerArr), map(toStream), switchLatest, reduce(sum, 0)))
    },
    {
      group: '10k → just',
      variant: '@aelea switchMap',
      fn: () => runStream(op(fromIterable(outerArr), switchMap(toStream), reduce(sum, 0)))
    }
  )
}

// 4. switchMap-promise — no @most equivalent without fromPromise wrap
{
  const outerArr = Array.from({ length: 1_000 }, (_, i) => i)
  const toPromise = (i: number) => Promise.resolve(i * 2)
  const toMostNow = (i: number) => MC.now(i * 2)
  tasks.push(
    {
      group: '1k → promise',
      variant: '@most (now, no wrap)',
      baseline: true,
      fn: () => runMost(MC.scan(sum, 0, MC.switchLatest(MC.map(toMostNow, fromArrayM(outerArr)))))
    },
    {
      group: '1k → promise',
      variant: '@aelea switchMap',
      fn: () => runStream(op(fromIterable(outerArr), switchMap(toPromise), reduce(sum, 0)))
    }
  )
}

const suite: ISuite = {
  title: 'switchLatest · switchMap',
  options: { time: 500, warmupTime: 250 },
  tasks
}

export default suite

if (import.meta.main) await runAndPrint(suite)
