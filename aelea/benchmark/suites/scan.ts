import * as MC from '@most/core'
import { fromIterable, op, reduce } from '../../src/stream/index.js'
import { fromArrayM, runMost, runStream } from '../lib/runtime.js'
import { type ISuite, runAndPrint } from '../lib/suite.js'

const n = 1_000_000
const arr = Array.from({ length: n }, (_, i) => i)
const sum = (x: number, y: number) => x + y

const suite: ISuite = {
  title: 'reduce · scan',
  subtitle: `${n.toLocaleString()} elements`,
  options: { time: 500, warmupTime: 250 },
  tasks: [
    {
      group: '',
      variant: '@most/core scan',
      baseline: true,
      fn: () => runMost(MC.scan(sum, 0, fromArrayM(arr)))
    },
    {
      group: '',
      variant: '@aelea reduce',
      fn: () => runStream(op(fromIterable(arr), reduce(sum, 0)))
    }
  ]
}

export default suite

if (import.meta.main) await runAndPrint(suite)
