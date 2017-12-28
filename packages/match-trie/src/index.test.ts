import { it, describe } from '@typed/test'
import { runEffects, tap, take, delay, now } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { resolveUrl, resolve } from './index'
import { collectEvents, collectOne, run } from '../utils'
import { createPathState } from './resolver'
import { curry2 } from '@most/prelude'



type pipe = <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => C
const pipe = <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => b(a(x))

const rawFragments = ['main', 'books', '3', 'chapters', '1']
const fragments = now(rawFragments)
const urlFragments = now(rawFragments.join('/'))

const url1Comp = pipe(resolveUrl('main'), pipe(resolve('books'), resolve(/\d+/)))

interface Prop {
  <T, K extends keyof T>(key: K, obj: T): T[K]
  <T, K extends keyof T>(key: K): (obj: T) => T[K]
}
const prop: Prop = curry2(<T, K extends keyof T>(key: K, obj: T) => obj[key])





export default describe(`basic tests`, [
  it('matches fragments', ({ equal }) =>
    collectOne(url1Comp(urlFragments)).then(
      pipe(prop('fragments'), equal(['main','books', /\d+/]))
    )
  ),
  it('matches resolved fragments', ({ equal }) =>
    collectOne(url1Comp(urlFragments)).then(
      pipe(prop('resolvedFragments'), equal(['main','books', '3']))
    )
  ),
  it('matches remaining target fragments', ({ equal }) =>
    collectOne(resolve('main', createPathState(fragments))).then(
      pipe(prop('targetRemaining'), equal(['books', '3', 'chapters', '1']))
    )
  ),
  it('matches remainig target url', ({ equal }) =>
    collectOne(url1Comp(urlFragments)).then(
      pipe(prop('targetRemaining'), equal(['chapters', '1']))
    )
  )
])


