import type { Pseudos } from 'csstype'
import { curry2, curry3, type IStream, map } from '../../stream/index.js'
import type { I$Node, IStyleCSS } from '../types.js'

export interface IStyleCurry {
  <TElement>(styleInput: IStyleCSS, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(styleInput: IStyleCSS): (node: I$Node<TElement>) => I$Node<TElement>
}

export interface IStylePseudoCurry {
  <TElement, E extends string>(
    pseudoClass: Pseudos | E,
    styleInput: IStyleCSS,
    node: I$Node<TElement>
  ): I$Node<TElement>
  <TElement, E extends string>(
    pseudoClass: Pseudos | E,
    styleInput: IStyleCSS
  ): (node: I$Node<TElement>) => I$Node<TElement>
  <TElement, E extends string>(
    pseudoClass: Pseudos | E
  ): (styleInput: IStyleCSS) => (node: I$Node<TElement>) => I$Node<TElement>
}

export interface IStyleBehaviorCurry {
  <TElement>(styleInput: IStream<IStyleCSS | null>, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(styleInput: IStream<IStyleCSS | null>): (node: I$Node<TElement>) => I$Node<TElement>
}

export interface IStyleInlineCurry {
  <TElement>(style: IStream<IStyleCSS>, node: I$Node<TElement>): I$Node<TElement>
  <TElement>(style: IStream<IStyleCSS>): (node: I$Node<TElement>) => I$Node<TElement>
}

export const styleInline: IStyleInlineCurry = curry2(
  <TElement>(style: IStream<IStyleCSS>, $node: I$Node<TElement>): I$Node<TElement> =>
    map(node => {
      node.styleInline.push(style)
      return node
    }, $node)
)

export const style: IStyleCurry = curry2(
  <TElement>(styleInput: IStyleCSS, source: I$Node<TElement>): I$Node<TElement> => {
    return map(node => {
      Object.assign(node.style, styleInput)
      return node
    }, source)
  }
)

export const stylePseudo: IStylePseudoCurry = curry3(
  <TElement, E extends string>(
    pseudoClass: Pseudos | E,
    styleInput: IStyleCSS,
    source: I$Node<TElement>
  ): I$Node<TElement> => {
    return map(node => {
      const existing = node.stylePseudo.find(entry => entry.class === pseudoClass)
      if (existing) {
        Object.assign(existing.style, styleInput)
      } else {
        node.stylePseudo.push({ class: pseudoClass, style: { ...styleInput } })
      }
      return node
    }, source)
  }
)

export const styleBehavior: IStyleBehaviorCurry = curry2(
  <TElement>(style: IStream<IStyleCSS | null>, $node: I$Node<TElement>): I$Node<TElement> => {
    return map(node => {
      node.styleBehavior.push(style)
      return node
    }, $node)
  }
)
