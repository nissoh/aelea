export type Path = string
export type Fragment = string | RegExp
export type PathEvent = readonly Path[]

export type RouteConfig = {
  fragment: Fragment
}

export type Route = {
  fragment: Fragment
  fragments: readonly Fragment[]
}
