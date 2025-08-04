import type { IStream } from '../types.js'
import { isStream } from '../utils/common.js'
import { curry2 } from '../utils/function.js'
import { fromPromise } from './fromPromise.js'
import { map } from './map.js'
import { switchLatest } from './switchLatest.js'

/**
 * Map each value to a stream and switch to the latest one
 * 
 * stream:                -a----b----c->
 * switchMap(x => x$):    -aa---bbb--ccc->
 *   where a$ = -a-a-|
 *         b$ = -b-b-b-|
 *         c$ = -c-c-c->
 */
export const switchMap: ISwitchMapCurry = curry2((cb, s) => {
  return switchLatest(
    map((cbParam) => {
      const cbRes = cb(cbParam)
      return isStream(cbRes) ? cbRes : fromPromise(cbRes)
    }, s)
  )
})

export type IStreamOrPromise<T> = IStream<T> | Promise<T>

export interface ISwitchMapCurry {
  <T, R>(cb: (t: T) => IStreamOrPromise<R>, s: IStream<T>): IStream<R>
  <T, R>(cb: (t: T) => IStreamOrPromise<R>): (s: IStream<T>) => IStream<R>
}
