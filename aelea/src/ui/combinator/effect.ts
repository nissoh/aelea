import { type IStream, map } from '../../stream/index.js'
import type { I$Node, I$Scheduler, IMutator, INode } from '../types.js'
import { makeMutator } from './mutator.js'

export interface IEffectPropCurry {
  (prop: string, source: IStream<unknown>, node: I$Node): I$Node
  (prop: string, source: IStream<unknown>): IMutator
  (prop: string): (source: IStream<unknown>) => IMutator
}

export interface IEffectRunCurry {
  (apply: (element: unknown, scheduler: I$Scheduler) => Disposable | void, node: I$Node): I$Node
  (apply: (element: unknown, scheduler: I$Scheduler) => Disposable | void): IMutator
}

export const effectProp = ((prop: string, source?: IStream<unknown>, node?: I$Node) => {
  if (source === undefined) {
    return ((nextSource: IStream<unknown>, nextNode?: I$Node) => (effectProp as any)(prop, nextSource, nextNode)) as any
  }
  const entry = { key: prop, value: source }
  const mutate = (n: INode) => {
    n.propBehavior.push(entry)
    return n
  }
  if (node !== undefined) return map(mutate, node)
  return makeMutator(mutate)
}) as IEffectPropCurry

export const effectRun = ((apply: (element: unknown, scheduler: I$Scheduler) => Disposable | void, node?: I$Node) => {
  const entry = { key: '__run__', value: apply as unknown as IStream<unknown> }
  const mutate = (n: INode) => {
    n.propBehavior.push(entry)
    return n
  }
  if (node !== undefined) return map(mutate, node)
  return makeMutator(mutate)
}) as IEffectRunCurry
