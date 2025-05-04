import { component, type I$Branch, style } from 'aelea/core'
import { $column, spacing } from 'aelea/ui-components'
import { fadeIn } from './transitions/enter'

interface Example {
  file: string
}

export const $Example =
  (_: Example) =>
  (...$content: I$Branch[]) =>
    component(() => {
      return [fadeIn($column(spacing.big, style({ flex: 1 }))(...$content))]
    })
