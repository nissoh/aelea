import { Behavior } from '@aelea/core'
import { event, $text, component, INode, style } from '@aelea/dom'
import { $Button, $column, $row, layoutSheet } from "@aelea/ui-components"
import { ContractTransaction } from "@ethersproject/contracts"
import { awaitPromises, snapshot, switchLatest } from "@most/core"
import { $labeledDivider, $tokenLabel } from "../$elements"
import { $anchor } from "../../../../elements/$common"
import { awaitProvider } from "../api/provider"
import { ITransaction } from "../api/types"
import { formatFixed } from "../api/utils"

export interface IConfirmation {
  transaction: ITransaction
}


export const $Confirmation = (swapState: IConfirmation) => component((
  [confirm, confirmTether]: Behavior<any, ContractTransaction | string>,
  [back,    backTether]: Behavior<INode, PointerEvent>,
) => {

  return [
    $column(layoutSheet.spacingBig)(
      $text(style({ textAlign: 'center', fontSize: '25px' }))(
        'Review Transaction'
      ),

      $column(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
        $tokenLabel(swapState.transaction.token),
        // $icon({ $content: swapState.transaction.token.$icon, fill: pallete.message, width: '42px', viewBox: '0 0 32 32' }),
        $text(style({ fontWeight: 'bold' }))(
          formatFixed(swapState.transaction.value)
        )
      ),

      style({ margin: '0 -30px' })(
        $labeledDivider('Send To')
      ),

      $text(style({ fontSize: '75%', textAlign: 'center' }))(swapState.transaction.to),

      $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center', paddingTop: '25px' }))(
        $anchor(backTether(event('click')))(
          $text('Back')
        ),
        $Button({ $content: $text('Send') })({
          click: confirmTether(
            snapshot(async (provider) => {
              const newLocal = swapState.transaction.token.contract.transfer(swapState.transaction.to, swapState.transaction.value)
              return newLocal
            }, awaitProvider),
            awaitPromises,
            switchLatest,
          )
        })
      )

    ),
    { confirm, back }
  ]
})
