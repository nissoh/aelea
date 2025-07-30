import { fromPromise, isStream, map, switchLatest } from '../../stream/index.js'
import type { IStream } from '../../stream/types.js'

export type IStreamOrPromise<T> = IStream<T> | Promise<T>

export const switchMap =
  <T, R>(cb: (t: T) => IStreamOrPromise<R>) =>
  (s: IStream<T>): IStream<R> => {
    return switchLatest(
      map((cbParam: T) => {
        const cbRes = cb(cbParam)

        return isStream(cbRes) ? cbRes : fromPromise(cbRes)
      })(s)
    )
  }
