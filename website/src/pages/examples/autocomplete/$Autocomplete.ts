
import { component } from '@aelea/core'
import { $Autocomplete, $column, layoutSheet } from '@aelea/ui-components'
import { empty } from '@most/core'




export default component((

) =>
  [
    $column(layoutSheet.spacingSmall)(
      $Autocomplete({ change: empty() })({})
    )
  ]
)


