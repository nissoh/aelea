

import { Stream } from '@most/types'
import { startWith, never, constant } from '@most/core'
import { style } from '../core'

export const always = <T>(x: T): Stream<T> => startWith(x, never())
export const pipe = <A, B, C>(a: (a: A) => B, b: (b: B) => C) => (x: A) => b(a(x))

export const xForver = <T> (x: T) => startWith(x, never())
