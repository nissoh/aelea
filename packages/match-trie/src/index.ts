
import { Stream } from '@most/types'
import { curry2, CurriedFunction2 } from '@most/prelude'
import { Fragment, PathEvent, Fragments, Path, Paths } from './types'
import { resolve as resolveFn } from './resolver'
import { urlRouter as urlRouterFn } from './resolveUrl'


export const resolve = curry2<Fragment, Stream<PathEvent>, Stream<PathEvent>>(resolveFn)
export const resolveUrl = curry2<Fragment, Stream<string>, Stream<PathEvent>>(urlRouterFn)

export { urlToFragments } from './resolveUrl'
export { PathEvent, Fragment, Fragments, Path, Paths, CurriedFunction2 }
