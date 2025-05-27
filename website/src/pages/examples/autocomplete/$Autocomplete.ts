import { now } from '@most/core'
import { component } from 'aelea/core'
import { $column, $TextField, spacing } from 'aelea/ui-components'

export const $AutocompleteExample = component(() => [
  $column(spacing.small)($TextField({ value: now(''), label: 'dd' })({}))
])
