import { map } from '@most/core'
import type { Behavior } from 'aelea/core'
import {
  $element,
  $node,
  $text,
  type IBranch,
  component,
  nodeEvent,
} from 'aelea/dom'

export default component(
  ([input, inputTether]: Behavior<IBranch<HTMLInputElement>, string>) => {
    const inputBehavior = inputTether(
      nodeEvent('input'),
      map((inputEv) => {
        if (inputEv.target instanceof HTMLInputElement) {
          return inputEv.target.value
        }
        return ''
      }),
    )

    return [$node($element('input')(inputBehavior)(), $text(input))]
  },
)
