import type { Pseudos } from 'csstype'
import type { IStream } from '../../stream/index.js'
import type { I$Node, IMutator, IRecipe, IStaticStyleEntry, IStyleCSS } from '../types.js'
import { makeMutator, mutateOnEmit } from './mutator.js'

export interface IStyleCurry {
  <TElement>(styleInput: IStyleCSS, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(styleInput: IStyleCSS): IMutator<TElement>
}

export interface IStylePseudoCurry {
  <TElement, E extends string>(
    pseudoClass: Pseudos | E,
    styleInput: IStyleCSS,
    node: I$Node<TElement>
  ): I$Node<TElement>
  <TElement, E extends string>(pseudoClass: Pseudos | E, styleInput: IStyleCSS): IMutator<TElement>
  <TElement, E extends string>(pseudoClass: Pseudos | E): (styleInput: IStyleCSS) => IMutator<TElement>
}

export interface IStyleBehaviorCurry {
  <TElement>(styleInput: IStream<IStyleCSS | null>, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(styleInput: IStream<IStyleCSS | null>): IMutator<TElement>
}

/**
 * Static style: one cached class rule per distinct declaration set.
 */
export const style = ((styleInput: IStyleCSS, source?: I$Node) => {
  const entry: IStaticStyleEntry = { pseudo: null, style: styleInput }
  const mutate = (recipe: IRecipe) => {
    recipe.staticStyles.push(entry)
  }
  if (source !== undefined) return mutateOnEmit(mutate, source)
  return makeMutator(mutate)
}) as IStyleCurry

export const stylePseudo = ((pseudoClass: string, styleInput?: IStyleCSS, source?: I$Node) => {
  if (styleInput === undefined) {
    return ((nextInput: IStyleCSS, nextSource?: I$Node) =>
      (stylePseudo as any)(pseudoClass, nextInput, nextSource)) as any
  }
  const entry: IStaticStyleEntry = { pseudo: pseudoClass, style: styleInput }
  const mutate = (recipe: IRecipe) => {
    recipe.staticStyles.push(entry)
  }
  if (source !== undefined) return mutateOnEmit(mutate, source)
  return makeMutator(mutate)
}) as IStylePseudoCurry

/**
 * Reactive inline style. The stream owns the keys of its latest emission:
 * keys it stops emitting are removed and `null` removes them all, so the
 * browser cascades back to the static rule. One decorator per source.
 */
export const styleBehavior = ((source: IStream<IStyleCSS | null>, node?: I$Node) => {
  const mutate = (recipe: IRecipe) => {
    recipe.styleBehavior.push(source)
  }
  if (node !== undefined) return mutateOnEmit(mutate, node)
  return makeMutator(mutate)
}) as IStyleBehaviorCurry
