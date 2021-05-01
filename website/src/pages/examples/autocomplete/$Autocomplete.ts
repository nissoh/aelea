
import { component } from '@aelea/core'
import { $Autocomplete, $column, $TextField, layoutSheet } from '@aelea/ui-components'
import { empty, now } from '@most/core'




export const $AutocompleteExample = component((

) =>
  [
    $column(layoutSheet.spacingSmall)(
      $TextField({ value: now(''), label: 'dd' })({})
    )
  ]
)


