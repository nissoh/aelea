
import { map } from '@most/core'
import { $element, $node, $text, Behavior, component, ContainerDomNode, event } from 'fufu'

export default component((
  [sampleInput, input]: Behavior<ContainerDomNode<HTMLInputElement>, string>
) => {

  const inputBehavior = sampleInput(
    event('input'),
    map(inputEv => {
      if (inputEv.target instanceof HTMLInputElement) {
        return inputEv.target.value
      }
      return ''
    })
  )

  return [
    $node(
      // a simple input
      $element('input')(inputBehavior)(),

      // bind value sampled by input event behavior
      $text(input)
    )
  ]
})
