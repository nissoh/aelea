import type { IStream } from '../../stream/index.js'
import type { I$Node, IEffect, IMutator, IRecipe } from '../types.js'
import { makeMutator, mutateOnEmit } from './mutator.js'

export interface IEffectPropCurry {
  (prop: string, source: IStream<unknown>, node: I$Node): I$Node
  (prop: string, source: IStream<unknown>): IMutator
  (prop: string): (source: IStream<unknown>) => IMutator
}

export interface IEffectRunCurry {
  <TElement>(apply: IEffect<TElement>, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(apply: IEffect<TElement>): IMutator<TElement>
}

/**
 * Write each emission to a property of the element (`value` on an input).
 */
export const effectProp = ((prop: string, source?: IStream<unknown>, node?: I$Node) => {
  if (source === undefined) {
    return ((nextSource: IStream<unknown>, nextNode?: I$Node) => (effectProp as any)(prop, nextSource, nextNode)) as any
  }
  const entry = { key: prop, value: source }
  const mutate = (recipe: IRecipe) => {
    recipe.propBehavior.push(entry)
  }
  if (node !== undefined) return mutateOnEmit(mutate, node)
  return makeMutator(mutate)
}) as IEffectPropCurry

/**
 * Run an imperative effect against the mounted element; a returned
 * disposable runs on unmount.
 */
export const effectRun = ((apply: IEffect, node?: I$Node) => {
  const mutate = (recipe: IRecipe) => {
    recipe.effects.push(apply)
  }
  if (node !== undefined) return mutateOnEmit(mutate, node)
  return makeMutator(mutate)
}) as IEffectRunCurry
