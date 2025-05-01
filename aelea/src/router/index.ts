// biome-ignore lint/performance/noBarrelFile: entrypoint module
export { $RouterAnchor } from './components/$Anchor.js'
export type { IAnchor } from './components/$Anchor.js'
export { contains, create, isMatched, match } from './resolveUrl.js'
export type { Fragment, Path, PathEvent, Route, RouteConfig } from './types.js'
