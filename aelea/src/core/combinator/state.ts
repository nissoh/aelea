import { combineArray as combineArrayMost, now, zipArray } from '@most/core'
import type { Stream } from '@most/types'
import { isStream, toStream } from '../common.js'

export type InputStateParams<T> = {
  [P in keyof T]: Stream<T[P]> | T[P]
}

export type InputArrayParams<T extends any[]> = {
  [P in keyof T]: Stream<T[P]>
}

export function combineState<A, K extends keyof A = keyof A>(state: InputStateParams<A>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K]> | A[K]][]

  if (entries.length === 0) {
    return now({} as A)
  }

  const streams = entries.map(([_, stream]) => toStream(stream))

  const zipped = combineArray(
    (...arrgs: A[K][]) => {
      return arrgs.reduce((seed, val, idx) => {
        const key = entries[idx][0]
        seed[key] = val

        return seed
      }, {} as A)
    },
    ...streams
  )

  return zipped
}

export function zipState<A, K extends keyof A = keyof A>(state: InputStateParams<A>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K]>][]
  const streams = entries.map(([_, stream]) => stream)

  const zipped = zipArray((...arrgs: A[K][]) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, {} as A)
  }, streams)

  return zipped
}

// temorary typings fix for this issue https://github.com/mostjs/core/pull/543
export function combineArray<A extends any[], B>(cb: (...args: A) => B, ...streamList: InputArrayParams<A>): Stream<B> {
  return combineArrayMost(cb, streamList)
}
