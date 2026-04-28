import { fragmentsFromLocation } from './location.js'
import { buildRouteTree } from './resolveUrl.js'
import type { Fragment, Route, RouteConfig } from './types.js'

export interface RouteSpec {
  fragment: Fragment
  title?: string
  param?: string
  children?: Record<string, RouteSpec>
}

export type ParamsOf<T extends RouteSpec> = ResolveParams<CollectParams<T>>

type CollectParams<T extends RouteSpec> =
  | (T extends { param: infer P extends string } ? P : never)
  | (T['children'] extends Record<string, RouteSpec> ? CollectParams<T['children'][keyof T['children']]> : never)

type ResolveParams<S> = [S] extends [never] ? Record<string, never> : { [K in S & string]: string }

export type RouteNode<T extends RouteSpec> = Route &
  (T['children'] extends Record<string, RouteSpec>
    ? { [K in keyof T['children'] & string]: RouteNode<T['children'][K]> }
    : Record<string, never>)

// Schema keys must not collide with the public Route field names.
const RESERVED: ReadonlySet<string> = new Set(['contains', 'match', 'fragment', 'fragments'])

interface NodeMeta {
  spec: RouteSpec
  parent: Route | null
}

const metaOf = new WeakMap<Route, NodeMeta>()

const segmentOf = (spec: RouteSpec, params: Record<string, string>): string => {
  if (typeof spec.fragment === 'string') return spec.fragment
  if (!spec.param) {
    throw new Error('uiRouter: RegExp route segment requires a `param` name to support href()')
  }
  const value = params[spec.param]
  if (value === undefined) {
    throw new Error(`uiRouter: missing required route param "${spec.param}"`)
  }
  return value
}

type ChildBuilder = (parentFragments: readonly Fragment[]) => (config: RouteConfig) => Route

const attachChildren = (
  parent: Route,
  parentFragments: readonly Fragment[],
  children: Record<string, RouteSpec> | undefined,
  childOf: ChildBuilder
): void => {
  if (!children) return
  const buildChild = childOf(parentFragments)
  for (const [key, spec] of Object.entries(children)) {
    if (RESERVED.has(key)) {
      throw new Error(`uiRouter: route key "${key}" collides with a reserved Route property`)
    }
    const child = buildChild({ fragment: spec.fragment })
    metaOf.set(child, { spec, parent })
    attachChildren(child, [...parentFragments, spec.fragment], spec.children, childOf)
    Object.assign(parent, { [key]: child })
  }
}

export const createRouteSchema = <T extends RouteSpec>(spec: T): RouteNode<T> => {
  if (typeof spec.fragment !== 'string') {
    throw new Error('uiRouter: root route fragment must be a string (used as the base path)')
  }
  const tree = buildRouteTree({
    fragment: spec.fragment,
    fragmentsChange: fragmentsFromLocation(spec.fragment)
  })
  metaOf.set(tree.root, { spec, parent: null })
  attachChildren(tree.root, [spec.fragment], spec.children, tree.child)
  return tree.root as RouteNode<T>
}

export const href = <T extends RouteSpec>(node: RouteNode<T>, params?: ParamsOf<T>): string => {
  const safeParams = (params as Record<string, string> | undefined) ?? {}
  const segments: string[] = []
  let cursor: Route | null = node
  while (cursor) {
    const meta = metaOf.get(cursor)
    if (!meta) break
    const seg = segmentOf(meta.spec, safeParams)
    if (seg !== '') segments.unshift(seg)
    cursor = meta.parent
  }
  return `/${segments.join('/')}`
}

export const titleOf = (node: Route): string | undefined => metaOf.get(node)?.spec.title
