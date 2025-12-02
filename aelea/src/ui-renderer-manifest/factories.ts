import { $text, createNode, type INodeCompose } from '@/ui'

export type ManifestElement = { tag: string; namespace?: 'svg' | 'html' }

const createManifestNode = (tag: string, namespace: 'svg' | 'html' = 'html'): INodeCompose<ManifestElement> =>
  createNode(() => ({ tag, namespace }))

export function $element(tag = 'div'): INodeCompose<ManifestElement> {
  return createManifestNode(tag, 'html')
}

export function $custom(tag: string): INodeCompose<ManifestElement> {
  return createManifestNode(tag, 'html')
}

export function $svg(tag: string): INodeCompose<ManifestElement> {
  return createManifestNode(tag, 'svg')
}

export const $node: INodeCompose<ManifestElement> = createManifestNode('div', 'html')

export function $wrapNativeElement<T>(element: T): INodeCompose<T> {
  return createNode(() => element)
}

export { $text }
