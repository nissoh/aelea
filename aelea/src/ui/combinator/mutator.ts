import { map } from '../../stream/index.js'
import type { I$Node, IMutator, IRecipe } from '../types.js'

export function makeMutator<TElement>(mutate: (recipe: IRecipe<TElement>) => void): IMutator<TElement> {
  const op = ((source: I$Node<TElement>) => mutateOnEmit(mutate, source)) as IMutator<TElement>
  op.__mutate = mutate
  return op
}

/**
 * Per-emission application, for a decorator that follows a stream op or the
 * direct `decorator(payload, $node)` form. The recipe is shared by every
 * instance of the compose, so the mutation lands on a per-emission copy.
 */
export function mutateOnEmit<TElement>(
  mutate: (recipe: IRecipe<TElement>) => void,
  source: I$Node<TElement>
): I$Node<TElement> {
  return map(node => {
    const recipe = cloneRecipe(node.recipe)
    mutate(recipe)
    return { ...node, recipe }
  }, source)
}

function cloneRecipe<TElement>(recipe: IRecipe<TElement>): IRecipe<TElement> {
  return {
    element: recipe.element,
    $segments: recipe.$segments,
    staticStyles: recipe.staticStyles.slice(),
    styleBehavior: recipe.styleBehavior.slice(),
    attributes: { ...recipe.attributes },
    attributesBehavior: recipe.attributesBehavior.slice(),
    propBehavior: recipe.propBehavior.slice(),
    effects: recipe.effects.slice()
  }
}
