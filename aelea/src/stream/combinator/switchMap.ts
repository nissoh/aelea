import type { IStream } from '../types.js'
import { isStream } from '../utils/common.js'
import { curry2 } from '../utils/function.js'
import { fromPromise } from './fromPromise.js'
import { map } from './map.js'
import { switchLatest } from './switchLatest.js'

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
