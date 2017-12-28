

export type Path = string
export type Paths = Path[]
export type Fragment = string | RegExp
export type Fragments = Fragment[]

export type PathEvent = {
  fragments: Fragments,
  targetfragments: Paths,
  targetRemaining: Paths,
  resolvedFragments: Paths
}
