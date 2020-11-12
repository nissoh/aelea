import { now } from '@most/core'
import { curry2 } from '@most/prelude'
import { describe, it } from '@typed/test'
import { O } from '@aelea/core'
import { collectEvents } from 'utils'
import { match } from './index'

const rawFragments = ['main', 'books', '3', 'chapters', '1']
const paths = now(rawFragments)
const urlFragments = now(rawFragments.join('/'))

const url1Comp = O(
  match('main'),
  match('books'),
  match(/\d+/)
)

interface Prop {
  <T, K extends keyof T>(key: K): (obj: T) => T[K]
  <T, K extends keyof T>(key: K, obj: T): T[K]
}


const prop: Prop = curry2((key, obj: any) => obj[key])



export default describe(`basic tests`, [

  it('matches fragments', async ({ equal }) => {
    const frsgs = (await collectOne(url1Comp(urlFragments))).fragments
    equal(frsgs, ['main', 'books', /\d+/])
  }),
  it('matches resolved fragments', ({ equal }) =>
    collectOne(url1Comp(urlFragments)).then(
      O(prop('match'), equal(['main', 'books', '3']))
    )
  ),
  it('matches remaining target fragments', ({ equal }) =>
    collectOne(resolve('main', createPathState(paths))).then(
      O(prop('targetRemaining'), equal(['books', '3', 'chapters', '1']))
    )
  ),
  it('matches remainig target url', ({ equal }) =>
    collectOne(url1Comp(urlFragments)).then(
      O(prop('targetRemaining'), equal(['chapters', '1']))
    )
  )

])



// import { Stream } from '@most/types'
// import { tap, runEffects, take } from '@most/core'
// import { newDefaultScheduler } from '@most/scheduler'
// import { curry2 } from '@most/prelude'


// export type Event<T> = { time: number, value: T }


// export const pipe = <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => b(a(x))
// const scheduler = newDefaultScheduler()
// export const run = <T>(s: Stream<T>) => runEffects(s, scheduler)

// export function collectEvents<T>(stream: Stream<T>) {
//   const into: Event<T>[] = []
//   const s = tap(x => into.push({ time: scheduler.currentTime(), value: x }), stream)
//   return run(s).then(() => into)
// }


// export interface CollectNCurry {
//   <T>(n: number, stream: Stream<T>): Promise<Event<T>[]>
//   <T>(n: number): (stream: Stream<T>) => Promise<Event<T>[]>
// }

// function collectNFn<T>(n: number, stream: Stream<T>) {
//   return collectEvents<T>(take(n, stream))
// }

// export const collectN: CollectNCurry = curry2(collectNFn)


// export const collectOne = <T>(s: Stream<T>) =>
//   collectEvents(take(1, s)).then(x => x[0].value)


