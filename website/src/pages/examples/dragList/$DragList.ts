import { Behavior } from '@aelea/core'
import { component, $Branch, IBranchElement, style, $text } from '@aelea/dom'
import { $card, $column, $row, $Sortable, elevation1, elevation12, elevation2, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"


export default component(([order, orderTether]: Behavior<$Branch<IBranchElement, {}>[], $Branch<IBranchElement, {}>[]>) => {

  const $list = Array(4).fill(null).map((_, i) =>
    $card(flex, elevation2, style({ backgroundColor: pallete.background, placeContent: 'center', height: '90px', alignItems: 'center' }))(
      $text('node: ' + i)
    )
  )

  return [
    $row(style({ placeContent: 'stretch' }))(
      $Sortable({
        $list,
        itemHeight: 90,
        gap: 10
      })({ orderChange: orderTether() })
    )
  ]
})