
import { component } from '@aelea/dom'
import { $Autocomplete, $column, $TextField, layoutSheet } from '@aelea/ui-components'
import { empty, now } from '@most/core'




export const $AutocompleteExample = component((

) =>
  [
    $column(spacing.small)(
      $TextField({ value: now(''), label: 'dd' })({})
    )
  ]
)


