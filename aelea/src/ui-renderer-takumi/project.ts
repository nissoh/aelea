/**
 * Project a resolved snapshot (`ResolvedNode`) into the takumi node shape —
 * `container` / `text` / `image` — that `@takumi-rs/core`'s `Renderer`
 * accepts directly. No React symbols, no element-shape emulation.
 *
 * Mapping rules:
 *   tag='img' + `src` attribute  → { type: 'image', src, … }
 *   any other node               → { type: 'container', children, style }
 *   string child                 → { type: 'text', text, … }
 */

import type { IStyleCSS } from '../ui/index.js'
import type { ResolvedNode } from './snapshot.js'

export type TakumiContainerNode = {
  type: 'container'
  style?: IStyleCSS
  children?: TakumiNode[]
}

export type TakumiTextNode = {
  type: 'text'
  text: string
  style?: IStyleCSS
}

export type TakumiImageNode = {
  type: 'image'
  src: string
  width?: number
  height?: number
  style?: IStyleCSS
}

export type TakumiNode = TakumiContainerNode | TakumiTextNode | TakumiImageNode

function nonEmptyStyle(style: Record<string, string>): IStyleCSS | undefined {
  for (const _key in style) return style as unknown as IStyleCSS
  return undefined
}

function parseDimension(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const n = Number.parseInt(value, 10)
  if (Number.isFinite(n) && n > 0) return n
  return undefined
}

export function snapshotToTakumi(node: ResolvedNode): TakumiNode {
  const style = nonEmptyStyle(node.style)

  if (node.tag === 'img' && typeof node.attributes.src === 'string') {
    const image: TakumiImageNode = { type: 'image', src: node.attributes.src }
    const width = parseDimension(node.attributes.width)
    const height = parseDimension(node.attributes.height)
    if (width !== undefined) image.width = width
    if (height !== undefined) image.height = height
    if (style) image.style = style
    return image
  }

  const children: TakumiNode[] = []
  for (const child of node.children) {
    if (typeof child === 'string') {
      if (child.length > 0) children.push({ type: 'text', text: child })
    } else {
      children.push(snapshotToTakumi(child))
    }
  }

  const container: TakumiContainerNode = { type: 'container' }
  if (style) container.style = style
  if (children.length > 0) container.children = children
  return container
}
