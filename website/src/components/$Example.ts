import { component, type I$Node, style } from 'aelea/ui'
import { $column, spacing } from 'aelea/ui-components'
import { fadeIn } from './transitions/enter'

interface Example {
  file: string
}

export const $Example =
  (_: Example) =>
  (...$content: I$Node[]) =>
    component(() => {
      return [fadeIn($column(spacing.big, style({ flex: 1 }))(...$content))]
    })
