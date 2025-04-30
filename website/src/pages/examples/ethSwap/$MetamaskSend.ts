
import { component, style } from '@aelea/dom'
import { $card, $column, elevation2, layoutSheet } from '@aelea/ui-components'
import { map, merge, mergeArray, now, switchLatest } from '@most/core'
import { fadeIn } from '../../../components/transitions/enter'
import { $Confirmation } from './components/$Confirmation'
import { $Transaction } from './components/$Transaction'
import { ITransaction } from './api/types'
import { $AccountConnectivity } from './components/$ConnectAccount'
import { $CreateTransaction } from './components/$CreateTransaction'
import { ContractTransaction } from '@ethersproject/contracts'
import { Behavior } from '@aelea/core'


export interface ExchangeUnit {
  symbol: string
  exchangeScale: number

  /** Orders of magnitude between the unit of account and the base unit */
  accountScale: number
  /**
   * Number of orders of magnitude between this unit and the base unit
   * - Defines the unit of the asset (e.g. ether, gwei, or wei, in the case of the asset ETH)
   * - By default, this should be 0, the base unit (typically the smallest denomination of the asset)
   */
  decimals: number
}



export const $EtherSwapExample = component((
  [send, sendTether]: Behavior<ITransaction, ITransaction>,
  [backToMainClick, backToMainClickClick]: Behavior<PointerEvent, PointerEvent>,
  [txHash, sampleTxHash]: Behavior<ContractTransaction | string, ContractTransaction | string>,
  [account, accountTether]: Behavior<string, string>,
) => {

  const initialSwapCard = merge(now(null), backToMainClick)

  return [
    $column(spacing.big, style({ placeContent: 'center', alignItems: 'center' }))(
      $AccountConnectivity()({
        account: accountTether()
      }),
      
      $card(elevation2, style({ borderRadius: '30px', padding: '30px', width: '470px' }))(
        switchLatest(
          mergeArray([
            map(() => $CreateTransaction({
              send: sendTether()
            }), initialSwapCard),
            map(transaction =>
              fadeIn(
                $Confirmation({ transaction })({
                  confirm: sampleTxHash(),
                  back: backToMainClickClick()
                })
              )
            , send),
            map(tx =>
              fadeIn(
                $Transaction(typeof tx === 'string' ? tx : tx.hash )({
                  close: backToMainClickClick(),
                })
              ),
            txHash
            )
          ])
        )
      ),

    ),
    
  ]
})


