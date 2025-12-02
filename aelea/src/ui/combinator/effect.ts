import { curry2, curry3, map } from '@/stream'
import type { I$Node, I$Scheduler, INode } from '../types.js'

export interface IEffectPropCurry {
  (prop: string, source: any, node: I$Node): I$Node
  (prop: string, source: any): (node: I$Node) => I$Node
}

export const effectProp: IEffectPropCurry = curry3((prop: string, source: any, node: I$Node): I$Node => {
  return map((n: INode) => {
    const propBehavior = [...(n.propBehavior ?? []), { key: prop, value: source }]
    return { ...n, propBehavior }
  }, node)
})

// No-op placeholder to keep API surface compatible; prop-based behaviors should be used instead.
export const effectRun = curry2(
  (apply: (element: unknown, scheduler: I$Scheduler) => Disposable | void, node: I$Node): I$Node => {
    return map((n: INode) => {
      const propBehavior = [...(n.propBehavior ?? []), { key: '__run__', value: apply as any }]
      return { ...n, propBehavior }
    }, node)
  }
)
