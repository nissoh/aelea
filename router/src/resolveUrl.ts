
import { constant, filter, join, map, skipRepeats, skipRepeatsWith, tap, until } from '@most/core'
import { Stream } from '@most/types'
import { O } from '@aelea/core'
import { Fragment, Path, PathEvent, Route, RouteConfig } from './types'



type RootRouteConfig = RouteConfig & {
  splitUrlPattern?: RegExp | string
  pathChange: Stream<string>
}


export const create = ({ fragment = '', splitUrlPattern = /(?:\/|$)/, pathChange, title }: RootRouteConfig) => {

  const ignoreRepeatPathChanges = skipRepeats(pathChange)

  const changes = map((rawPath): PathEvent => {
    const target = rawPath === '/' ? [''] : rawPath.split(splitUrlPattern)

    return { target }
  }, ignoreRepeatPathChanges)

  return resolveRoute(changes, [])({ fragment, title })
}


function resolveRoute(pathChange: Stream<PathEvent>, parentFragments: Fragment[]) {
  return ({ fragment, title }: RouteConfig): Route => {
    const fragments = [...parentFragments, fragment]
    const fragIdx = parentFragments.length

    const diff = O(
      skipRepeatsWith((prev: PathEvent, next: PathEvent) => {
        return next.target[fragIdx] === prev.target[fragIdx]
      })
    )


    const contains = O(
      diff,
      filter(next => {
        return isMatched(fragment, next.target[fragIdx])
      }),
    )

    const match = O(
      map((evt: PathEvent) => {
        const lastTarget = evt.target.slice(-1)[0]
        return isMatched(fragment, lastTarget)
      }),
      tap(() => {
        if (title && document.title !== title) {
          document.title = title;
        }
      })
    )

    const miss = O(
      diff,
      filter(next => !isMatched(fragment, next.target[fragIdx]))
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


