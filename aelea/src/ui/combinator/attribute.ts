import type { IStream } from '../../stream/index.js'
import type { I$Node, IAttributes, IMutator, IRecipe } from '../types.js'
import { makeMutator, mutateOnEmit } from './mutator.js'

export interface IAttributeCurry {
  <TElement>(attrs: IAttributes, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(attrs: IAttributes): IMutator<TElement>
}

export interface IAttributeBehaviorCurry {
  <TElement>(source: IStream<IAttributes | null>, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(source: IStream<IAttributes | null>): IMutator<TElement>
}

export const attr = ((attrs: IAttributes, source?: I$Node) => {
  const mutate = (recipe: IRecipe) => {
    Object.assign(recipe.attributes, attrs)
  }
  if (source !== undefined) return mutateOnEmit(mutate, source)
  return makeMutator(mutate)
}) as IAttributeCurry

/**
 * Reactive attributes with the same ownership rule as `styleBehavior`: the
 * stream owns the keys of its latest emission, a missing or `null` key is
 * removed, `null` removes them all.
 */
export const attrBehavior = ((source: IStream<IAttributes | null>, node?: I$Node) => {
  const mutate = (recipe: IRecipe) => {
    recipe.attributesBehavior.push(source)
  }
  if (node !== undefined) return mutateOnEmit(mutate, node)
  return makeMutator(mutate)
}) as IAttributeBehaviorCurry
