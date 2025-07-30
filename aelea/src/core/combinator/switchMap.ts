import { curry2, fromPromise, isStream, map, switchLatest } from '../../stream/index.js'
import type { IStream } from '../../stream/types.js'

export type IStreamOrPromise<T> = IStream<T> | Promise<T>

export interface ISwitchMapCurry2 {
  <T, R>(cb: (t: T) => IStreamOrPromise<R>, s: IStream<T>): IStream<R>
  <T, R>(cb: (t: T) => IStreamOrPromise<R>): (s: IStream<T>) => IStream<R>
}

function switchMapFn<T, R>(cb: (t: T) => IStreamOrPromise<R>, s: IStream<T>) {
  return switchLatest(
    map((cbParam) => {
      const cbRes = cb(cbParam)

      return isStream(cbRes) ? cbRes : fromPromise(cbRes)
    }, s)
  )
}

export const switchMap: ISwitchMapCurry2 = curry2(switchMapFn)
