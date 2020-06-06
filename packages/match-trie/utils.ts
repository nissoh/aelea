


import { Stream, Scheduler } from '@most/types'
import { tap, runEffects, take, now } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { curry2 } from '@most/prelude'


export type Event<T> = { time: number, value: T }


const scheduler = newDefaultScheduler()

export async function collectEvents<T> (stream: Stream<T>) {
  const into: Event<T>[] = []
  const s = tap(x => into.push({ time: scheduler.currentTime(), value: x }), stream)
  await runEffects(s, scheduler)
  return into
}


interface CollectNCurry {
  <T>(n: number, stream: Stream<T>): Promise<Event<T>[]>
  <T>(n: number): (stream: Stream<T>) => Promise<Event<T>[]>
}

function collectNFn <T> (n: number, stream: Stream<T>) {
  return collectEvents<T>(take(n, stream))
}

export const collectN: CollectNCurry = curry2(collectNFn)


export const collectOne = <T>(s: Stream<T>) =>
 collectEvents(take(1, s)).then(x => x[0].value)


