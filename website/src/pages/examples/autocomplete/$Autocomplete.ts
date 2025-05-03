import { empty, now } from '@most/core'
import { component } from 'aelea/dom'
import { $TextField, $column, spacing } from 'aelea/ui-components'

export const $AutocompleteExample = component(() => [
  $column(spacing.small)($TextField({ value: now(''), label: 'dd' })({}))
])
