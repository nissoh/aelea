import { Stream } from "@most/types"


export type Path = string
export type Fragment = string | RegExp


export type PathEvent = {
  target: Path[]
}

export type Route = {
  create: (newPath: RouteConfig) => Route
  match: Stream<PathEvent>
  miss: Stream<PathEvent>
  fragments: Fragment[]
}

export type RouteConfig = {
  fragment: Fragment
  title?: string
}