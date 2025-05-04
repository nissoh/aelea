import { map } from '@most/core'
import type { IBehavior } from 'aelea/core'
import { $element, $node, $text, component, type INode, nodeEvent } from 'aelea/core'

export default component(([input, inputTether]: IBehavior<INode<HTMLInputElement>, string>) => {
  const inputBehavior = inputTether(
    nodeEvent('input'),
    map((inputEv) => {
      if (inputEv.target instanceof HTMLInputElement) {
        return inputEv.target.value
      }
      return ''
    })
  )

  return [$node($element('input')(inputBehavior)(), $text(input))]
})
