

import { curry2, compose, CurriedFunction2 } from '@most/prelude'
import { map } from '@most/core'
import { Fragment, Fragments } from './types'
import { Stream } from '@most/types'
import { resolve, createPathState } from './resolver'

export const urlToFragments = curry2<string, string, Fragments>((delimiter, str) => str.split(delimiter))
export const fragments = map(urlToFragments('/'))

export const createUrlPathState = compose(createPathState, fragments)

export function urlRouter (frag: Fragment, stream: Stream<string>) {
  return resolve(frag, createUrlPathState(stream))
}


export { CurriedFunction2 }
