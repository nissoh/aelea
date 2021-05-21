import { attrBehavior, O } from "@aelea/core"
import { $element, $text, attr, Behavior, component, style } from "@aelea/core"
import { $Button, $column, $icon, $NumberTicker, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { TransactionReceipt } from "@ethersproject/providers"
import { filter } from "@most/core"
import { map, skipRepeats, startWith, switchLatest } from "@most/core"
import { getTxDetails } from "../api/transaction"
import { shortenTxAddress } from "../api/utils"
import { $spinner } from "../$elements"
import { $check } from "../../../../elements/$icons"
import { network } from "../api/account"
import { EXPLORER_URL } from "../api/provider"




const $status = $text(style({ color: pallete.foreground, fontStyle: 'italic', fontSize: '19px', padding: '3px 0' }))

const $success = $column(
  $icon({ $content: $check, fill: pallete.positive, width: '55px', viewBox: '0 0 24 24', svgOps: style({ margin: '0 auto' }) }),
  $status(`Success`)
)

const $pending = $column(
  $spinner(style({  width: '55px', height: '55px', }))(),
  $status(`Pending`)
)

const $failed = $status(style({ color: pallete.negative }))()


export const $Transaction = (txHash: string) => component((
  [close, sampleTether]: Behavior<any, any>,
) => {

  const txDetails = getTxDetails(txHash)
  const confirmations = map(details => details?.confirmations ?? 0, txDetails)

  const $status = O(
    map((details: TransactionReceipt) => details?.status),
    skipRepeats,
    filter(status => Number.isInteger(status)),
    map(status => {
      return status === 1 ? $success : $failed
    }),
    startWith($pending),
    switchLatest
  )(txDetails)


  return [
    $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
      $text(style({ fontSize: '25px' }))(
        'Transaction Details'
      ),

      $status,

      $row(layoutSheet.spacingTiny)(
        $text('Confirmations: '),
        $NumberTicker({ incrementColor: pallete.positive, decrementColor: pallete.message, value$: confirmations })
      ),

      $row(layoutSheet.spacing)(
        $text('Tx Hash: '),
        $element('a')(style({ color: pallete.primary }), attrBehavior(map(chain => ({ href: EXPLORER_URL[chain] + 'tx/' + txHash }), network)))(
          $text(shortenTxAddress(txHash))
        )
      ),

      $Button({ $content: $text('Close') })({
        click: sampleTether()
      })

    ),
    { close }
  ]
})