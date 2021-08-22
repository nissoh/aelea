
import { map } from '@most/core'
import { $element, $node, $text, component, IBranch, event } from '@aelea/dom'
import { Behavior } from '@aelea/core'

export default component((
  [input, inputTether]: Behavior<IBranch<HTMLInputElement>, string>
) => {

  const inputBehavior = inputTether(
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
