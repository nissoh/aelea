
import { map } from '@most/core'
import { $element, $node, $text, Behavior, component, IBranch, event } from '@aelea/core'

export default component((
  [sampleInput, input]: Behavior<IBranch<HTMLInputElement>, string>
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
