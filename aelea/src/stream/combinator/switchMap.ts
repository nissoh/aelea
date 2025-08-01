import { isStream } from '../common.js'
import { curry2 } from '../function.js'
import { fromPromise } from '../source/fromPromise.js'
import type { IStream } from '../types.js'
import { map } from './map.js'
import { switchLatest } from './switchLatest.js'

export type IStreamOrPromise<T> = IStream<T> | Promise<T>

export interface ISwitchMapCurry {
  <T, R>(cb: (t: T) => IStreamOrPromise<R>, s: IStream<T>): IStream<R>
  <T, R>(cb: (t: T) => IStreamOrPromise<R>): (s: IStream<T>) => IStream<R>
}

export const switchMap: ISwitchMapCurry = curry2((cb, s) => {
  return switchLatest(
    map((cbParam) => {
      const cbRes = cb(cbParam)
      return isStream(cbRes) ? cbRes : fromPromise(cbRes)
    }, s)
  )
})
