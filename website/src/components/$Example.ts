import { type $Branch, component, style } from "aelea/dom"
import { $column, spacing } from "aelea/ui-components"
import { fadeIn } from "./transitions/enter"


interface Example {
  file: string,
}

export default (_: Example) => (...$content: $Branch[]) => component(() => {

  return [
    fadeIn(
      $column(spacing.big, style({ flex: 1 }))(
        ...$content
      )
    )
  ]
})

