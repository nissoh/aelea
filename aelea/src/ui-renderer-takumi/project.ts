import type { ContainerNode, ImageNode, Node, TextNode } from '@takumi-rs/core'
import type { IStyleCSS } from '../ui/types.js'
import type { ResolvedNode } from './snapshot.js'

/**
 * Project a resolved tree into takumi's `container` / `text` / `image` nodes.
 *
 *   tag='img' + `src` attribute  → image
 *   any other node               → container (tagName carried for presets)
 *   string child                 → text
 */
export function snapshotToTakumi(node: ResolvedNode): Node {
  const style = hasKeys(node.style) ? (node.style as unknown as IStyleCSS) : undefined

  if (node.tag === 'img' && typeof node.attributes.src === 'string') {
    const image: ImageNode = { type: 'image', tagName: 'img', src: node.attributes.src }
    const width = parseDimension(node.attributes.width)
    const height = parseDimension(node.attributes.height)
    if (width !== undefined) image.width = width
    if (height !== undefined) image.height = height
    if (style) image.style = style
    return image
  }

  const children: Node[] = []
  for (const child of node.children) {
    if (typeof child === 'string') {
      if (child.length > 0) children.push({ type: 'text', text: child } satisfies TextNode)
    } else {
      children.push(snapshotToTakumi(child))
    }
  }

  const container: ContainerNode = { type: 'container', tagName: node.tag }
  if (style) container.style = style
  if (children.length > 0) container.children = children
  return container
}

function hasKeys(record: Record<string, string>): boolean {
  for (const _key in record) return true
  return false
}

function parseDimension(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}
