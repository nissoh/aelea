import {
  constant,
  filter,
  filterNull,
  type IStream,
  map,
  op,
  skipRepeatsWith,
  switchLatest,
  tap,
  until
} from '../stream/index.js'
import type { Fragment, Path, PathEvent, Route, RouteConfig } from './types.js'

type RootRouteConfig = RouteConfig & {
  fragmentsChange: IStream<PathEvent>
}

export const create = ({ fragment = '', fragmentsChange, title }: RootRouteConfig) => {
  const ignoreRepeatPathChanges = skipRepeatsWith((next, prev) => {
    return next.length === prev.length && next.every((f, i) => f === prev[i])
  }, fragmentsChange)

  return resolveRoute(ignoreRepeatPathChanges, [])({ fragment, title })
}

function resolveRoute(pathChange: IStream<PathEvent>, parentFragments: Fragment[]) {
  return ({ fragment, title }: RouteConfig): Route => {
    const fragments = [...parentFragments, fragment]
    const fragIdx = parentFragments.length

    const diff = skipRepeatsWith((prev: PathEvent, next: PathEvent) => {
      return prev[fragIdx] === next[fragIdx]
    })

    const contains = op(
      pathChange,
      diff,
      filter((next: PathEvent) => {
        return isMatched(fragment, next[fragIdx])
      })
    )

    const match = op(
      pathChange,
      map((evt: PathEvent) => {
        if (evt.length !== fragments.length) {
          return false
        }

        const everyMatched = evt.every((f, i) => isMatched(fragments[i], f))

        return everyMatched
      }),
      tap((isMatched: boolean) => {
        if (isMatched) {
          document.title = title || ''
        }
      })
    )

    const miss = op(
      pathChange,
      diff,
      filter((next: PathEvent) => !isMatched(fragment, next[fragIdx]))
    )

    return {
      create: resolveRoute(pathChange, fragments),
      contains,
      match,
      miss,
      fragments
    }
  }
}

export function isMatched(frag: Fragment, path: Path) {
  if (frag instanceof RegExp) {
    return Boolean(path?.match(frag))
  }
  return frag === path
}

export const contains =
  <T>(route: Route) =>
  (ns: IStream<T>) => {
    const miss = op(ns, until(route.miss))
    const contains = op(route.contains, constant(miss))
    return op(contains, switchLatest)
  }

export const match =
  <T>(route: Route) =>
  (ns: IStream<T>) => {
    return switchLatest(
      filterNull(
        map((isMatch) => {
          return isMatch ? ns : null
        }, route.match)
      )
    )
  }
