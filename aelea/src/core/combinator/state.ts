import { combine, isStream, now, toStream } from '../../stream/index.js'
import type { IStream } from '../../stream/types.js'

export type InputStateParams<T> = {
  [P in keyof T]: IStream<T[P]> | T[P]
}

export type InputArrayParams<T extends any[]> = {
  [P in keyof T]: IStream<T[P]>
}

export function combineState<A, K extends keyof A = keyof A>(state: InputStateParams<A>): IStream<A> {
  const entries = Object.entries(state) as [keyof A, IStream<A[K]> | A[K]][]

  if (entries.length === 0) {
    return now({} as A)
  }

  const keys = entries.map(([key]) => key)
  const streams = entries.map(([_, stream]) => toStream(stream))
  const initialValues = entries.map(([key, stream]) => (isStream(stream) ? undefined : stream)) as A[K][]

  return {
    run(scheduler, sink) {
      return combine(streams as any, initialValues).run(scheduler, {
        event(values: A[K][]) {
          const result = values.reduce((seed, val, idx) => {
            seed[keys[idx]] = val
            return seed
          }, {} as A)
          sink.event(result)
        },
        error: sink.error.bind(sink),
        end: sink.end.bind(sink)
      })
    }
  }
}

// zipState is removed as zip functionality should be implemented separately if needed

export function combineArray<A extends any[], B>(cb: (...args: A) => B, streamList: InputArrayParams<A>): IStream<B> {
  const initialValues = streamList.map(() => undefined) as A

  return {
    run(scheduler, sink) {
      return combine(streamList as any, initialValues).run(scheduler, {
        event(values: A) {
          sink.event(cb(...values))
        },
        error: sink.error,
        end: sink.end
      })
    }
  }
}
