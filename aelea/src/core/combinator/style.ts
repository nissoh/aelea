import type * as CSS from 'csstype'
import type { IStream } from '../../stream/index.js'
import { filter, map, tap } from '../../stream/index.js'
import type { I$Op, INodeElement } from '../source/node.js'

export type IStyleCSS = CSS.Properties

export const styleInline = <T extends INodeElement>(style: IStream<IStyleCSS>): I$Op<T> =>
  map((node: any) => {
    const applyInlineStyleStream = tap((styleObj: IStyleCSS) => {
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
    })(style)

    return {
      ...node,
      styleBehavior: [...node.styleBehavior, filter(() => false)(applyInlineStyleStream)]
    }
  })

export const style = <T extends INodeElement>(styleInput: IStyleCSS): I$Op<T> =>
  map((node) => ({ ...node, style: { ...node.style, ...styleInput } }))

export const stylePseudo = <T extends INodeElement, E extends string>(
  pseudoClass: CSS.Pseudos | E,
  styleInput: IStyleCSS
): I$Op<T> => {
  return map((node) => ({
    ...node,
    stylePseudo: [
      ...node.stylePseudo,
      {
        class: pseudoClass,
        style: styleInput
      }
    ]
  }))
}

export const styleBehavior = <T extends INodeElement>(style: IStream<IStyleCSS | null>): I$Op<T> =>
  map((node) => ({ ...node, styleBehavior: [...node.styleBehavior, style] }))
