import type { Pseudos } from 'csstype'
import { curry2, curry3, type IStream, map } from '@/stream'
import type { I$Node, INodeElement, IStyleCSS } from '../types.js'

export interface IStyleCurry {
  <T extends INodeElement>(styleInput: IStyleCSS, node: I$Node<T>): I$Node<T>
  <T extends INodeElement>(styleInput: IStyleCSS): (node: I$Node<T>) => I$Node<T>
}

export interface IStylePseudoCurry {
  <T extends INodeElement, E extends string>(
    pseudoClass: Pseudos | E,
    styleInput: IStyleCSS,
    node: I$Node<T>
  ): I$Node<T>
  <T extends INodeElement, E extends string>(
    pseudoClass: Pseudos | E,
    styleInput: IStyleCSS
  ): (node: I$Node<T>) => I$Node<T>
  <T extends INodeElement, E extends string>(
    pseudoClass: Pseudos | E
  ): (styleInput: IStyleCSS) => (node: I$Node<T>) => I$Node<T>
}

export interface IStyleBehaviorCurry {
  <T extends INodeElement>(styleInput: IStream<IStyleCSS | null>, node: I$Node<T>): I$Node<T>
  <T extends INodeElement>(styleInput: IStream<IStyleCSS | null>): (node: I$Node<T>) => I$Node<T>
}

export interface IStyleInlineCurry {
  <T extends INodeElement>(style: IStream<IStyleCSS>, node: I$Node<T>): I$Node<T>
  <T extends INodeElement>(style: IStream<IStyleCSS>): (node: I$Node<T>) => I$Node<T>
}

export const styleInline: IStyleInlineCurry = curry2(
  <T extends INodeElement>(style: IStream<IStyleCSS>, $node: I$Node<T>): I$Node<T> =>
    map(node => {
      node.styleInline = [...node.styleInline, style]
      return node
    }, $node)
)

export const style: IStyleCurry = curry2(
  <T extends INodeElement>(styleInput: IStyleCSS, source: I$Node<T>): I$Node<T> => {
    return map(node => {
      node.style = { ...node.style, ...styleInput }
      return node
    }, source)
  }
)

export const stylePseudo: IStylePseudoCurry = curry3(
  <T extends INodeElement, E extends string>(
    pseudoClass: Pseudos | E,
    styleInput: IStyleCSS,
    source: I$Node<T>
  ): I$Node<T> => {
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
  <T extends INodeElement>(style: IStream<IStyleCSS | null>, $node: I$Node<T>): I$Node<T> => {
    return map(node => ({ ...node, styleBehavior: [...node.styleBehavior, style] }), $node)
  }
)
