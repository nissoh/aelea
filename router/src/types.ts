import { Stream } from "@most/types"


export type Path = string
export type Fragment = string | RegExp


export type PathEvent = {
  fragments: Fragment[],

  target: Path[],
  remaining: Path[]
}

export type Route = {
  create: (newPath: Fragment) => Route
  match: Stream<PathEvent>;
  miss: Stream<PathEvent>;
  fragments: Fragment[]
}