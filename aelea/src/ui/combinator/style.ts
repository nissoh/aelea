import type { Pseudos } from 'csstype'
import { curry2, curry3, type IStream, map } from '@/stream'
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
      node.styleInline = [...node.styleInline, style]
      return node
    }, $node)
)

export const style: IStyleCurry = curry2(
  <TElement>(styleInput: IStyleCSS, source: I$Node<TElement>): I$Node<TElement> => {
    return map(node => {
      node.style = { ...node.style, ...styleInput }
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
      const nextPseudo = [...node.stylePseudo]
      const idx = nextPseudo.findIndex(entry => entry.class === pseudoClass)

      if (idx >= 0) {
        nextPseudo[idx] = {
          class: pseudoClass,
          style: { ...nextPseudo[idx].style, ...styleInput }
        }
      } else {
        nextPseudo.push({
          class: pseudoClass,
          style: { ...styleInput }
        })
      }

      node.stylePseudo = nextPseudo

      return node
    }, source)
  }
)

export const styleBehavior: IStyleBehaviorCurry = curry2(
  <TElement>(style: IStream<IStyleCSS | null>, $node: I$Node<TElement>): I$Node<TElement> => {
    return map(node => ({ ...node, styleBehavior: [...node.styleBehavior, style] }), $node)
  }
)
