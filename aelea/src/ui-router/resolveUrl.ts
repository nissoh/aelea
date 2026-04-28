import { type IStream, just, map, skipRepeats, skipRepeatsWith, switchLatest } from '../stream/index.js'
import { state } from '../stream-extended/index.js'
import type { Fragment, Path, PathEvent, Route, RouteConfig } from './types.js'

type RootRouteConfig = RouteConfig & {
  fragmentsChange: IStream<PathEvent>
}

interface RouteStatus {
  match: IStream<boolean>
  contains: IStream<boolean>
}

const statusOf = new WeakMap<Route, RouteStatus>()

const samePath = (a: PathEvent, b: PathEvent): boolean =>
  a === b || (a.length === b.length && a.every((f, i) => f === b[i]))

function isMatched(frag: Fragment, path: Path | undefined): boolean {
  if (path === undefined) return false
  if (frag instanceof RegExp) return frag.test(path)
  return frag === path
}

const buildRoute = (
  pathChange: IStream<PathEvent>,
  parentFragments: readonly Fragment[],
  { fragment }: RouteConfig
): Route => {
  const fragments: readonly Fragment[] = [...parentFragments, fragment]
  const fragIdx = parentFragments.length

  const contains = skipRepeats(map(p => isMatched(fragment, p[fragIdx]), pathChange))
  const match = skipRepeats(
    map(p => p.length === fragments.length && p.every((f, i) => isMatched(fragments[i], f)), pathChange)
  )

  const route: Route = { fragment, fragments }
  statusOf.set(route, { match, contains })
  return route
}

const requireStatus = (route: Route): RouteStatus => {
  const status = statusOf.get(route)
  if (status === undefined) {
    throw new Error('uiRouter: route was not built via createRouteSchema')
  }
  return status
}

export const isContaining = (route: Route): IStream<boolean> => requireStatus(route).contains

export const buildRouteTree = (
  config: RootRouteConfig
): {
  root: Route
  child: (parentFragments: readonly Fragment[]) => (config: RouteConfig) => Route
} => {
  const sharedPath = state(skipRepeatsWith(samePath, config.fragmentsChange))
  const root = buildRoute(sharedPath, [], { fragment: config.fragment })
  return {
    root,
    child: parentFragments => cfg => buildRoute(sharedPath, parentFragments, cfg)
  }
}

const nothing: IStream<null> = just(null)

const guard =
  (predicate: IStream<boolean>) =>
  <T>(ns: IStream<T>): IStream<T | null> =>
    switchLatest(map(active => (active ? (ns as IStream<T | null>) : nothing), predicate))

export const contains = (route: Route) => guard(requireStatus(route).contains)
export const match = (route: Route) => guard(requireStatus(route).match)
