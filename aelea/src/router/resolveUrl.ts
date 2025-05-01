import {
  constant,
  filter,
  join,
  map,
  skipRepeatsWith,
  switchLatest,
  tap,
  until,
} from '@most/core'
import type { Stream } from '@most/types'
import { O } from '../core/common.js'
import type { Fragment, Path, PathEvent, Route, RouteConfig } from './types.js'

type RootRouteConfig = RouteConfig & {
  fragmentsChange: Stream<PathEvent>
}

export const create = ({
  fragment = '',
  fragmentsChange,
  title,
}: RootRouteConfig) => {
  const ignoreRepeatPathChanges = skipRepeatsWith((next, prev) => {
    return next.length === prev.length && next.every((f, i) => f === prev[i])
  }, fragmentsChange)

  return resolveRoute(ignoreRepeatPathChanges, [])({ fragment, title })
}

function resolveRoute(
  pathChange: Stream<PathEvent>,
  parentFragments: Fragment[],
) {
  return ({ fragment, title }: RouteConfig): Route => {
    const fragments = [...parentFragments, fragment]
    const fragIdx = parentFragments.length

    const diff = O(
      skipRepeatsWith((prev: PathEvent, next: PathEvent) => {
        return next[fragIdx] === prev[fragIdx]
      }),
    )

    const contains = O(
      diff,
      filter((next) => {
        return isMatched(fragment, next[fragIdx])
      }),
    )

    const match = O(
      map((evt: PathEvent) => {
        if (evt.length !== fragments.length) {
          return false
        }

        const everyMatched = evt.every((f, i) => isMatched(fragments[i], f))

        return everyMatched
      }),
      tap((isMatched) => {
        if (isMatched) {
          document.title = title || ''
        }
      }),
    )

    const miss = O(
      diff,
      filter((next) => !isMatched(fragment, next[fragIdx])),
    )

    return {
      create: resolveRoute(pathChange, fragments),
      contains: contains(pathChange),
      match: match(pathChange),
      miss: miss(pathChange),
      fragments,
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
  (ns: Stream<T>) => {
    return switchLatest(constant(until(route.miss, ns), route.contains))
  }

export const match =
  <T>(route: Route) =>
  (ns: Stream<T>) => {
    const exactMatch = filter((isMatch) => isMatch, route.match)
    const unmatch = filter((isMatch) => !isMatch, route.match)

    return join(constant(until(unmatch, ns), exactMatch))
  }
