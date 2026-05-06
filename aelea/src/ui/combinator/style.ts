import type { Pseudos } from 'csstype'
import { type IStream, map } from '../../stream/index.js'
import type { I$Node, IMutator, INode, IStaticStyleEntry, IStyleCSS } from '../types.js'
import { makeMutator } from './mutator.js'

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

export interface IStyleInlineCurry {
  <TElement>(style: IStream<IStyleCSS>, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(style: IStream<IStyleCSS>): IMutator<TElement>
}

export const style = ((styleInput: IStyleCSS, source?: I$Node) => {
  const entry: IStaticStyleEntry = { pseudo: null, style: styleInput }
  const mutate = (node: INode) => {
    node.staticStyles.push(entry)
    return node
  }
  if (source !== undefined) return map(mutate, source)
  return makeMutator(mutate)
}) as IStyleCurry

export const stylePseudo = ((pseudoClass: string, styleInput?: IStyleCSS, source?: I$Node) => {
  if (styleInput === undefined) {
    return ((nextInput: IStyleCSS, nextSource?: I$Node) =>
      (stylePseudo as any)(pseudoClass, nextInput, nextSource)) as any
  }
  const entry: IStaticStyleEntry = { pseudo: pseudoClass, style: styleInput }
  const mutate = (node: INode) => {
    node.staticStyles.push(entry)
    return node
  }
  if (source !== undefined) return map(mutate, source)
  return makeMutator(mutate)
}) as IStylePseudoCurry

export const styleBehavior = ((stream$: IStream<IStyleCSS | null>, source?: I$Node) => {
  const mutate = (node: INode) => {
    node.styleBehavior.push(stream$)
    return node
  }
  if (source !== undefined) return map(mutate, source)
  return makeMutator(mutate)
}) as IStyleBehaviorCurry

export const styleInline = ((stream$: IStream<IStyleCSS>, source?: I$Node) => {
  const mutate = (node: INode) => {
    node.styleInline.push(stream$)
    return node
  }
  if (source !== undefined) return map(mutate, source)
  return makeMutator(mutate)
}) as IStyleInlineCurry
