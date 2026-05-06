import { map } from '../../stream/index.js'
import type { I$Node, IMutator, INode } from '../types.js'

export function makeMutator<TElement>(mutate: (node: INode<TElement>) => INode<TElement>): IMutator<TElement> {
  const op = ((source: I$Node<TElement>) => map(mutate, source)) as IMutator<TElement>
  op.__mutate = mutate
  return op
}
