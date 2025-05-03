import type { Behavior } from 'aelea/core'
import { type $Branch, $text, type IBranchElement, component, style } from 'aelea/dom'
import { $Sortable, $card, $row, designSheet, layoutSheet } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

export default component(([_, orderTether]: Behavior<$Branch<IBranchElement, {}>[], $Branch<IBranchElement, {}>[]>) => {
  const $list = Array(4)
    .fill(null)
    .map((_, i) =>
      $card(
        layoutSheet.flex,
        designSheet.elevation2,
        style({
          backgroundColor: pallete.background,
          placeContent: 'center',
          height: '90px',
          alignItems: 'center'
        })
      )($text(`node: ${i}`))
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
