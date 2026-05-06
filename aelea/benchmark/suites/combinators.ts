import * as MC from '@most/core'
import { combineMap, fromIterable, merge, zipMap } from '../../src/stream/index.js'
import { fromArrayM, runMost, runStream } from '../lib/runtime.js'
import { type IBenchTask, type ISuite, runAndPrint } from '../lib/suite.js'

const n = 100
const numbers = Array.from({ length: n }, (_, i) => i)

const sum = (x: number, y: number) => x + y
const add3 = (a: number, b: number, c: number) => a + b + c

function pair(group: string, mostFn: () => Promise<unknown>, aeleaFn: () => Promise<unknown>): IBenchTask[] {
  return [
    { group, variant: '@most/core', baseline: true, fn: mostFn },
    { group, variant: '@aelea', fn: aeleaFn }
  ]
}

const tasks: IBenchTask[] = [
  ...pair(
    'merge × 2',
    () => runMost(MC.merge(fromArrayM(numbers), fromArrayM(numbers))),
    () => runStream(merge(fromIterable(numbers), fromIterable(numbers)))
  ),
  ...pair(
    'merge × 5',
    () => runMost(MC.mergeArray(Array.from({ length: 5 }, () => fromArrayM(numbers)))),
    () => runStream(merge(...Array.from({ length: 5 }, () => fromIterable(numbers))))
  ),
  ...pair(
    'combine × 2',
    () => runMost(MC.combine(sum, fromArrayM(numbers), fromArrayM(numbers))),
    () => runStream(combineMap(sum, fromIterable(numbers), fromIterable(numbers)))
  ),
  ...pair(
    'combine × 3',
    () => runMost(MC.combineArray(add3, [fromArrayM(numbers), fromArrayM(numbers), fromArrayM(numbers)])),
    () => runStream(combineMap(add3, fromIterable(numbers), fromIterable(numbers), fromIterable(numbers)))
  ),
  ...pair(
    'zip × 2',
    () => runMost(MC.zip(sum, fromArrayM(numbers), fromArrayM(numbers))),
    () => runStream(zipMap(sum, fromIterable(numbers), fromIterable(numbers)))
  ),
  ...pair(
    'zip × 3',
    () => runMost(MC.zipArray(add3, [fromArrayM(numbers), fromArrayM(numbers), fromArrayM(numbers)])),
    () => runStream(zipMap(add3, fromIterable(numbers), fromIterable(numbers), fromIterable(numbers)))
  )
]

const suite: ISuite = {
  title: 'combinators',
  subtitle: `${n} items per stream`,
  options: { time: 500, warmupTime: 250 },
  tasks
}

export default suite

if (import.meta.main) await runAndPrint(suite)
