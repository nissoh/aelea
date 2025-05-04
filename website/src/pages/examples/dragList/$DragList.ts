import type { IBehavior } from 'aelea/core'
import { $text, component, type I$Node, type INodeElement, style } from 'aelea/core'
import { $card, $row, $Sortable, designSheet, layoutSheet } from 'aelea/ui-components'
import { pallete } from 'aelea/ui-components-theme'

export default component(([_, orderTether]: IBehavior<I$Node<Element>[], I$Node<Element>[]>) => {
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
