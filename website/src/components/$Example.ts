import { component, style } from 'aelea/core'
import { $column, spacing } from 'aelea/ui-components'
import { fadeIn } from './transitions/enter'
import type { $Branch } from 'aelea/core-types'

interface Example {
  file: string
}

export const $Example =
  (_: Example) =>
    (...$content: $Branch[]) =>
      component(() => {
        return [fadeIn($column(spacing.big, style({ flex: 1 }))(...$content))]
      })
