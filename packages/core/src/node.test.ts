require('jsdom-global')()

import { it } from '@typed/test'
import { node } from './index'
import { runEffects, tap, take } from '@most/core'
import { Stream, Scheduler } from '@most/types'
import { newDefaultScheduler } from '@most/scheduler'
import { curry2 } from '@most/prelude'
import { pipe } from '../../examples/src/utils'

const defScheduler = newDefaultScheduler()

type Event<T> = { time: number, value: T }

export function collectEvents<T> (stream: Stream<T>, scheduler: Scheduler) {
  const into: Event<T>[] = []
  const s = tap(x => into.push({ time: scheduler.now(), value: x }), stream)
  return runEffects(s, scheduler).then(() => into)
}

const eqInstance = curry2((b: Function, a: Object) => a instanceof b)
const fstEventValue = <T>(a: Event<T>[]) => a[0].value

const isNode = pipe(fstEventValue, eqInstance(Node))

export const emitNode = it('Emits node', ({ ok }) =>
  collectEvents(take(1, node), defScheduler).then(pipe(isNode, ok))
)





