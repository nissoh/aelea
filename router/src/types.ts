import { Stream } from "@most/types"


export type Path = string
export type Fragment = string | RegExp


export type PathEvent = {
  target: Path[]
}

export type Route = {
  create: (newPath: RouteConfig) => Route
  contains: Stream<PathEvent>
  match: Stream<boolean>
  miss: Stream<PathEvent>
  fragments: Fragment[]
}

export type RouteConfig = {
  fragment: Fragment
  title?: string
}