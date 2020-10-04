
import { map } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { $element, $node, $text, $wrapNativeElement, Behavior, component, DomNode, event, runAt } from 'fufu'


const $SimpleInput = component((
  [sampleInput, input]: Behavior<DomNode<HTMLInputElement>, string>
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
  $wrapNativeElement(document.body)(
    $SimpleInput()
  ),
  newDefaultScheduler()
)


