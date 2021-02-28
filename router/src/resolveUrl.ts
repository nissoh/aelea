
import { constant, filter, join, map, skipRepeatsWith, tap, until } from '@most/core'
import { Stream } from '@most/types'
import { O } from '@aelea/core'
import { Fragment, Path, PathEvent, Route, RouteConfig } from './types'



type RootRouteConfig = RouteConfig & {
  fragmentsChange: Stream<PathEvent>
}


export const create = ({ fragment = '', fragmentsChange, title }: RootRouteConfig) => {
  const ignoreRepeatPathChanges = skipRepeatsWith((next, prev) => {
    return next.length === prev.length && next.every((f, i) => f === prev[i])
  }, fragmentsChange)

  return resolveRoute(ignoreRepeatPathChanges, [])({ fragment, title })
}


function resolveRoute(pathChange: Stream<PathEvent>, parentFragments: Fragment[]) {
  return ({ fragment, title }: RouteConfig): Route => {
    const fragments = [...parentFragments, fragment]
    const fragIdx = parentFragments.length

    const diff = O(
      skipRepeatsWith((prev: PathEvent, next: PathEvent) => {
        return next[fragIdx] === prev[fragIdx]
      })
    )


    const contains = O(
      diff,
      filter(next => {
        return isMatched(fragment, next[fragIdx])
      }),
    )

    const match = O(
      map((evt: PathEvent) => {
        const lastTarget = evt.slice(-1)[0]
        return isMatched(fragment, lastTarget)
      }),
      tap(isMatched => {
        if (isMatched) {
          document.title = title || ''
        }
      })
    )

    const miss = O(
      diff,
      filter(next => !isMatched(fragment, next[fragIdx]))
    )


    return {
      create: resolveRoute(pathChange, fragments),
      contains: contains(pathChange),
      match: match(pathChange),
      miss: miss(pathChange),
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


export const contains = <T>(route: Route) => (ns: Stream<T>) => {
  return join(constant(until(route.miss, ns), route.contains))
}

export const match = <T>(route: Route) => (ns: Stream<T>) => {
  const exactMatch = filter(isMatch => isMatch, route.match)
  const unmatch = filter(isMatch => !isMatch, route.match)

  return join(constant(until(unmatch, ns), exactMatch))
}


