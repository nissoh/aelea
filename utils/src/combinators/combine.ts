import { combineArray as combineArrayMost } from "@most/core"
import { Stream } from "@most/types"

type StreamInput<T> = {
  [P in keyof T]: Stream<T[P]>
}

type StreamInputArray<T extends any[]> = {
  [P in keyof T]: Stream<T[P]>
}


export function combineObject<A, K extends keyof A = keyof A>(state: StreamInput<A>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K]>][]
  const streams = entries.map(([_, stream]) => stream)

  const combinedWithInitial = combineArrayMost((...arrgs: A[K][]) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, {} as A)
  }, streams)

  return combinedWithInitial
}


// temorary typings fix for this issue https://github.com/mostjs/core/pull/543
export function combineArray<A extends any[], B>(cb: (...args: A) => B, ...streamList: StreamInputArray<A>): Stream<B> {
  return combineArrayMost(cb, streamList)
}