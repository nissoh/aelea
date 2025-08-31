import { constant, now } from 'aelea/stream'
import { component } from 'aelea/ui'
import { $column, $TextField, spacing } from 'aelea/ui-components'

export const $AutocompleteExample = component(() => [
  $column(spacing.small)($TextField({ value: constant('', now), label: 'dd' })({}))
])
