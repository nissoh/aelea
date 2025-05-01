import type { Behavior } from 'aelea/core'
import {
  component,
  type $Branch,
  type IBranchElement,
  style,
  $text,
} from 'aelea/dom'
import { $card, $row, $Sortable } from 'aelea/ui-components'
import { elevation2 } from '../../../../../lib/src/ui-components/elements/$elements'
import { flex } from '../../../../../lib/src/ui-components/style/layoutSheet'
import { pallete } from 'aelea/ui-components-theme'

export default component(
  ([_, orderTether]: Behavior<
    $Branch<IBranchElement, {}>[],
    $Branch<IBranchElement, {}>[]
  >) => {
    const $list = Array(4)
      .fill(null)
      .map((_, i) =>
        $card(
          flex,
          elevation2,
          style({
            backgroundColor: pallete.background,
            placeContent: 'center',
            height: '90px',
            alignItems: 'center',
          }),
        )($text(`node: ${i}`)),
      )

    return [
      $row(style({ placeContent: 'stretch' }))(
        $Sortable({
          $list,
          itemHeight: 90,
          gap: 10,
        })({ orderChange: orderTether() }),
      ),
    ]
  },
)
