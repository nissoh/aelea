import { fromPromise, map, switchLatest } from '@most/core'
import { curry2 } from '@most/prelude'
import type { Stream } from '@most/types'
import { isStream } from '../common.js'

export type IStreamOrPromise<T> = Stream<T> | Promise<T>

export interface ISwitchMapCurry2 {
  <T, R>(cb: (t: T) => IStreamOrPromise<R>, s: Stream<T>): Stream<R>
  <T, R>(cb: (t: T) => IStreamOrPromise<R>): (s: Stream<T>) => Stream<R>
}

function switchMapFn<T, R>(cb: (t: T) => IStreamOrPromise<R>, s: Stream<T>) {
  return switchLatest(
    map((cbParam) => {
      const cbRes = cb(cbParam)

      return isStream(cbRes) ? cbRes : fromPromise(cbRes)
    }, s)
  )
}

export const switchMap: ISwitchMapCurry2 = curry2(switchMapFn)
