

import { map, until, filter, skipRepeatsWith, skipRepeats, chain } from '@most/core'
import { isMatched } from './resolve'
import { PathEvent, Fragment, Route } from './types'
import { Stream } from '@most/types'
import { Op, O } from 'fufu'


const routerDefaults = {
  splitUrlPattern: /(?:\/|$)/,
  rootFragment: ''
}

export const router = (pathChange: Stream<string>, options = routerDefaults) => {

  const opts = options === routerDefaults
    ? routerDefaults
    : { ...routerDefaults, ...options }


  const url: Op<string, PathEvent> = O(
    skipRepeats,
    map((rawPath): PathEvent => {
      const urlToFragments = rawPath.substr(1).split(opts.splitUrlPattern)
      const targetPaths = [opts.rootFragment, ...urlToFragments]
      return {
        target: targetPaths,
        fragments: [],
        remaining: targetPaths
      }
    })
  )

  const rootRoute = resolveRoute(url(pathChange), [])(opts.rootFragment)

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


export const path = (route: Route) => <T>(ns: Stream<T>) => {
  return chain(() => until(route.miss, ns), route.match)
}


