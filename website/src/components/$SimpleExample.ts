import { map } from 'aelea/stream'
import type { IBehavior } from 'aelea/stream-extended'
import { $element, $node, $text, component, type INode, nodeEvent } from 'aelea/ui'

export default component(([input, inputTether]: IBehavior<INode<HTMLInputElement>, string>) => {
  const inputBehavior = inputTether(
    nodeEvent('input'),
    map(inputEv => {
      if (inputEv.target instanceof HTMLInputElement) {
        return inputEv.target.value
      }
      return ''
    })
  )

  return [$node($element('input')(inputBehavior)(), $text(input))]
})
