
import { constant, filter, join, map, skipRepeats, skipRepeatsWith, until } from '@most/core'
import { Stream } from '@most/types'
import { O, Op } from '@aelea/core'
import { isMatched } from './resolve'
import { Fragment, PathEvent, Route } from './types'


const configDefaults = {
  splitUrlPattern: /(?:\/|$)/,
  rootFragment: ''
}

export const resolveUrl = (config: typeof configDefaults): Op<string, PathEvent> => O(
  skipRepeats,
  map((rawPath): PathEvent => {
    const urlToFragments = rawPath.substr(1).split(config.splitUrlPattern)
    const targetPaths = [config.rootFragment, ...urlToFragments]
    return {
      target: targetPaths,
      fragments: [],
      remaining: targetPaths
    }
  })
)

export const router = (pathChange: Stream<string>, config: Partial<typeof configDefaults> = configDefaults) => {

  const opts = config === configDefaults
    ? configDefaults
    : { ...configDefaults, ...config }

  const rootRoute = resolveRoute(resolveUrl(opts)(pathChange), [])(opts.rootFragment)

  return rootRoute
}


function resolveRoute(pathChange: Stream<PathEvent>, parentFragments: Fragment[]) {
  return (fragment: Fragment): Route => {
    const fragments = [...parentFragments, fragment]
    const fragIdx = parentFragments.length


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


export const path = <T>(route: Route) => (ns: Stream<T>) => {
  return join(constant(until(route.miss, ns), route.match))
}


