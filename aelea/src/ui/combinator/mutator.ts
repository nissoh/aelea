import { map } from '../../stream/index.js'
import type { I$Node, IMutator, INode } from '../types.js'

export function makeMutator<TElement>(mutate: (node: INode<TElement>) => INode<TElement>): IMutator<TElement> {
  const op = ((source: I$Node<TElement>) => mutateOnEmit(mutate, source)) as IMutator<TElement>
  op.__mutate = mutate
  return op
}

// Per-emission application (post-stream-op decorators and the direct
// `decorator(payload, $node)` form). The emitted node's channel containers are
// shared by reference across every subscription of the same compose, so the
// mutation must land on a per-emission copy — pushing into the shared arrays
// accumulates duplicate entries once per subscription.
export function mutateOnEmit<TElement>(
  mutate: (node: INode<TElement>) => INode<TElement>,
  source: I$Node<TElement>
): I$Node<TElement> {
  return map(node => mutate(cloneChannels(node)), source)
}

function cloneChannels<TElement>(node: INode<TElement>): INode<TElement> {
  return {
    ...node,
    staticStyles: node.staticStyles.slice(),
    styleBehavior: node.styleBehavior.slice(),
    styleInline: node.styleInline.slice(),
    propBehavior: node.propBehavior.slice(),
    attributesBehavior: node.attributesBehavior.slice(),
    attributes: { ...node.attributes }
  }
}
