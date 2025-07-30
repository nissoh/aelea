import type { IStream } from '../stream/types.js'

export type Path = string
export type Fragment = string | RegExp
export type PathEvent = Path[]

export type Route = {
  create: (newPath: RouteConfig) => Route
  contains: IStream<PathEvent>
  match: IStream<boolean>
  miss: IStream<PathEvent>
  fragments: Fragment[]
}

export type RouteConfig = {
  fragment: Fragment
  title?: string
}
