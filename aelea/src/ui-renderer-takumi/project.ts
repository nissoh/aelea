/**
 * Project a settled `INode` snapshot into the takumi node shape —
 * `container` / `text` / `image` — that `@takumi-rs/core`'s `Renderer`
 * accepts directly. No React symbols, no element-shape emulation.
 *
 * Mapping rules:
 *   INode with tag='img' + src attribute  → { type: 'image', src, … }
 *   INode otherwise                       → { type: 'container', children, style }
 *   string child                          → { type: 'text', text, … }
 */

import type { INode, IStyleCSS } from '../ui/index.js'

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

function nonEmptyStyle(style: unknown): IStyleCSS | undefined {
  if (style === null || style === undefined) return undefined
  if (typeof style !== 'object') return undefined
  const entries = Object.entries(style as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null)
  if (entries.length === 0) return undefined
  // Coerce values to strings so takumi receives stable primitive CSS.
  const out: Record<string, string> = {}
  for (const [k, v] of entries) out[k] = String(v)
  return out as unknown as IStyleCSS
}

function parseIntOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10)
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

function getTag(element: unknown): string {
  if (element === null || element === undefined) return 'div'
  if (typeof element === 'object') {
    const tag = (element as { tag?: unknown }).tag
    if (typeof tag === 'string') return tag
    const tagName = (element as { tagName?: unknown }).tagName
    if (typeof tagName === 'string') return tagName.toLowerCase()
  }
  return 'div'
}

export function snapshotToTakumi(node: INode): TakumiNode {
  const tag = getTag(node.element)
  const attrs = (node.attributes ?? {}) as Record<string, unknown>
  const merged: Record<string, unknown> = {}
  for (const entry of node.staticStyles) {
    if (entry.pseudo === null) Object.assign(merged, entry.style)
  }
  const style = nonEmptyStyle(merged as IStyleCSS)

  if (tag === 'img' && typeof attrs.src === 'string') {
    const image: TakumiImageNode = { type: 'image', src: attrs.src }
    const width = parseIntOrUndefined(attrs.width)
    const height = parseIntOrUndefined(attrs.height)
    if (width !== undefined) image.width = width
    if (height !== undefined) image.height = height
    if (style) image.style = style
    return image
  }

  const children: TakumiNode[] = []
  for (const child of (node.$segments ?? []) as unknown[]) {
    if (child === null || child === undefined) continue
    if (typeof child === 'string') {
      if (child.length > 0) children.push({ type: 'text', text: child })
      continue
    }
    if (typeof child === 'number') {
      children.push({ type: 'text', text: String(child) })
      continue
    }
    if (typeof child === 'object' && '$segments' in (child as object)) {
      children.push(snapshotToTakumi(child as INode))
    }
  }

  const container: TakumiContainerNode = { type: 'container' }
  if (style) container.style = style
  if (children.length > 0) container.children = children
  return container
}
