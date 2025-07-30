import { filter, map, tap } from '@most/core'
import { curry2, curry3 } from '@most/prelude'
import type * as CSS from 'csstype'
import type { I$Node, INodeElement } from '../source/node.js'

export type IStyleCSS = CSS.Properties

export interface IStyleCurry {
  <T extends INodeElement>(styleInput: IStyleCSS, node: I$Node<T>): I$Node<T>
  <T extends INodeElement>(styleInput: IStyleCSS): (node: I$Node<T>) => I$Node<T>
}

export interface IStylePseudoCurry {
  <T extends INodeElement, E extends string>(
    pseudoClass: CSS.Pseudos | E,
    styleInput: IStyleCSS,
    node: I$Node<T>
  ): I$Node<T>
  <T extends INodeElement, E extends string>(
    pseudoClass: CSS.Pseudos | E,
    styleInput: IStyleCSS
  ): (node: I$Node<T>) => I$Node<T>
  <T extends INodeElement, E extends string>(
    pseudoClass: CSS.Pseudos | E
  ): (styleInput: IStyleCSS) => (node: I$Node<T>) => I$Node<T>
}

export interface IStyleBehaviorCurry {
  <T extends INodeElement>(styleInput: IStream<IStyleCSS | null>, node: I$Node<T>): I$Node<T>
  <T extends INodeElement>(styleInput: IStream<IStyleCSS | null>): (node: I$Node<T>) => I$Node<T>
}

export const styleInline =
  <A extends INodeElement>(style: IStream<IStyleCSS>) =>
  ($node: I$Node<A>): I$Node<A> => {
    return map((node) => {
      const applyInlineStyleStream = tap((styleObj) => {
        const keys = Object.keys(styleObj)

        for (let i = 0; i < keys.length; i++) {
          const prop = keys[i]

          if (Object.hasOwn(styleObj, prop)) {
            const styleDec = node.element.style
            const value = styleObj[prop as keyof IStyleCSS]

            // Ensure value is a string or null for setProperty
            styleDec.setProperty(prop, value === null || value === undefined ? null : String(value))
          }
        }
      }, style)

      return {
        ...node,
        styleBehavior: [...node.styleBehavior, filter(() => false, applyInlineStyleStream)]
      }
    }, $node)
  }

export const style: IStyleCurry = curry2(
  <T extends INodeElement>(styleInput: IStyleCSS, source: I$Node<T>): I$Node<T> => {
    return map((node) => ({ ...node, style: { ...node.style, ...styleInput } }), source)
  }
)

export const stylePseudo: IStylePseudoCurry = curry3(
  <T extends INodeElement, E extends string>(
    pseudoClass: CSS.Pseudos | E,
    styleInput: IStyleCSS,
    source: I$Node<T>
  ): I$Node<T> => {
    return map(
      (node) => ({
        ...node,
        stylePseudo: [
          ...node.stylePseudo,
          {
            class: pseudoClass,
            style: styleInput
          }
        ]
      }),
      source
    )
  }
)

export const styleBehavior: IStyleBehaviorCurry = curry2(
  <T extends INodeElement>(style: IStream<IStyleCSS | null>, $node: I$Node<T>): I$Node<T> => {
    return map((node) => ({ ...node, styleBehavior: [...node.styleBehavior, style] }), $node)
  }
)
