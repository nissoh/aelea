import { filter, map, tap } from '@most/core'
import { curry2, curry3 } from '@most/prelude'
import type { Stream } from '@most/types'
import type * as CSS from 'csstype'
import type { IBranchElement } from '../../core/types.js'
import type { I$Branch } from '../source/node.js'

export type IStyleCSS = CSS.Properties

export interface IStyleCurry {
  <C extends IBranchElement, D>(styleInput: IStyleCSS, node: I$Branch<C, D>): I$Branch<C, D>
  <C extends IBranchElement, D>(styleInput: IStyleCSS): (node: I$Branch<C, D>) => I$Branch<C, D>
}

export interface IStylePseudoCurry {
  <C extends IBranchElement, E extends string>(
    pseudoClass: CSS.Pseudos | E,
    styleInput: IStyleCSS,
    node: I$Branch<C>
  ): I$Branch<C>
  <C extends IBranchElement, E extends string>(
    pseudoClass: CSS.Pseudos | E,
    styleInput: IStyleCSS
  ): (node: I$Branch<C>) => I$Branch<C>
  <C extends IBranchElement, E extends string>(
    pseudoClass: CSS.Pseudos | E
  ): (styleInput: IStyleCSS) => (node: I$Branch<C>) => I$Branch<C>
}

export interface IStyleBehaviorCurry {
  <C extends IBranchElement, D>(styleInput: Stream<IStyleCSS | null>, node: I$Branch<C, D>): I$Branch<C, D>
  <C extends IBranchElement, D>(styleInput: Stream<IStyleCSS | null>): (node: I$Branch<C, D>) => I$Branch<C, D>
}

export const styleInline =
  <A extends IBranchElement, B>(style: Stream<IStyleCSS>) =>
  ($node: I$Branch<A, B>): I$Branch<A, B> => {
    return map((node) => {
      const applyInlineStyleStream = tap((styleObj) => {
        const keys = Object.keys(styleObj)

        for (let i = 0; i < keys.length; i++) {
          const prop = keys[i]

          if (Object.prototype.hasOwnProperty.call(styleObj, prop)) {
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
  <C extends IBranchElement, D>(styleInput: IStyleCSS, source: I$Branch<C, D>): I$Branch<C, D> => {
    return map((node) => ({ ...node, style: { ...node.style, ...styleInput } }), source)
  }
)

export const stylePseudo: IStylePseudoCurry = curry3(
  <C extends IBranchElement, E extends string>(
    pseudoClass: CSS.Pseudos | E,
    styleInput: IStyleCSS,
    source: I$Branch<C>
  ): I$Branch<C> => {
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
  <C extends IBranchElement, D>(style: Stream<IStyleCSS | null>, $node: I$Branch<C, D>): I$Branch<C, D> => {
    return map((node) => ({ ...node, styleBehavior: [...node.styleBehavior, style] }), $node)
  }
)
