
import { constant, filter, join, map, skipRepeats, skipRepeatsWith, tap, until } from '@most/core'
import { Stream } from '@most/types'
import { O } from '@aelea/core'
import { Fragment, Path, PathEvent, Route, RouteConfig } from './types'



type RootRouteConfig = RouteConfig & {
  splitUrlPattern?: RegExp | string
  pathChange: Stream<string>
}


export const router = ({ fragment = '', splitUrlPattern = /(?:\/|$)/, pathChange, title }: RootRouteConfig) => {

  const ignoreRepeatPathChanges = skipRepeats(pathChange)

  const changes = map((rawPath): PathEvent => {
    const removeInitialSlash = fragment ? rawPath.substr(1) : rawPath // stip / from empty path
    const target = removeInitialSlash.split(splitUrlPattern)

    return { target }
  }, ignoreRepeatPathChanges)

  return resolveRoute(changes, [fragment])({ fragment, title })
}


function resolveRoute(pathChange: Stream<PathEvent>, parentFragments: Fragment[]) {
  return ({ fragment, title }: RouteConfig): Route => {
    const fragments = [...parentFragments, fragment]
    const fragIdx = parentFragments.length - 1

    const diff = O(
      skipRepeatsWith((prev: PathEvent, next: PathEvent) => {
        return next.target[fragIdx] === prev.target[fragIdx]
      })
    )

    const currentMatch = O(
      diff,
      filter(next => {
        return isMatched(fragment, next.target[fragIdx])
      }),
      tap((evt) => {
        if (title && evt.target.slice(-1)[0] === fragment && document.title !== title) {
          document.title = title;
        }
      })
    )

    const currentMiss = O(
      diff,
      filter(next => !isMatched(fragment, next.target[fragIdx]))
    )


    return <Route>{
      create: resolveRoute(pathChange, fragments),
      match: currentMatch(pathChange),
      miss: currentMiss(pathChange),
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



export const path = <T>(route: Route) => (ns: Stream<T>) => {
  return join(constant(until(route.miss, ns), route.match))
}


