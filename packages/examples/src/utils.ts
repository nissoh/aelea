

import { Stream, Sink } from '@most/types'
import { startWith, never } from '@most/core'

export const pipe = <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => b(a(x))

export const xForver = <T> (x: T): Stream<T>  => startWith(x, never())

export const runSink = <Sink<any>> {
  // tslint:disable-next-line:no-empty
  event (t, x) { },
  // tslint:disable-next-line:no-empty
  end (t) { },
  // tslint:disable-next-line:no-empty
  error (t, x) {
    console.error(x)
  }
}

