
import { $Branch, component, style } from '@aelea/core'
import { $column, layoutSheet } from '@aelea/ui-components'
import { fadeIn } from './transitions/enter'


interface Example {
  file: string,
}

export default (config: Example) => (...$content: $Branch[]) => component(() => {

  return [
    fadeIn(
      $column(layoutSheet.spacingBig, style({ flex: 1 }))(
        ...$content
      )
    )
  ]
})

