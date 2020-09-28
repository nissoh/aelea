
import { component, $node, $text, Behavior, $element, event, runAt, wrapNativeElement } from 'fufu'
import { map } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'


const $SimpleInput = component((
  [sampleInput, input]: Behavior<any, string>
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


runAt(
  wrapNativeElement(document.body)(
    $SimpleInput()
  ),
  newDefaultScheduler()
)


