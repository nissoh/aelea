

import { Stream } from '@most/types'
import { startWith, never } from '@most/core'

export const pipe = <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => b(a(x))

export const xForver = <T> (x: T): Stream<T>  => startWith(x, never())
