
import { $text, Behavior, component, event, IBranch, style } from '@aelea/core'
import { $Button, $card, $column, $icon, $Popover, $row, $Slider, elevation2, layoutSheet, state } from '@aelea/ui-components'
import { pallete } from '@aelea/ui-components-theme'
import { constant, empty, map, merge, now, snapshot } from '@most/core'
import { $alert } from '../../../elements/$common'
import { $caretDblDown, $gaugeMetric } from './common'
import { tokenList } from './state'
import { Token } from './types'
import { $TokenInput } from './$TokenInput'

export interface AssetUnit {
  /** Unique identifier for the asset (typically a 3 or 4 character uppercase code) */
  readonly symbol: string

  /** Orders of magnitude between the unit of exchange and the base unit */
  readonly exchangeScale: number

  /** Orders of magnitude between the unit of account and the base unit */
  readonly accountScale: number

  /**
   * Number of orders of magnitude between this unit and the base unit
   * - Defines the unit of the asset (e.g. ether, gwei, or wei, in the case of the asset ETH)
   * - By default, this should be 0, the base unit (typically the smallest denomination of the asset)
   */
  readonly scale: number
}


// export const getRate = (source: AssetUnit, dest: AssetUnit, api?: RateApi): BigInt => {
//   let rate = 1n

//   // Only fetch the price if the assets are different -- otherwise rate is 1!
//   if (source.symbol !== dest.symbol) {
//     if (!api) {
//       throw new Error(
//         'API instance is required for non- like-kind conversions (e.g. BTC to ETH)'
//       )
//     }

//     const sourcePrice: bigint = api.getPrice(source.symbol)
//     const destPrice: bigint = api.getPrice(dest.symbol)
//     rate = (sourcePrice * destPrice)
//   }

//   const shift = BigInt(source.scale - source.exchangeScale - (dest.scale - dest.exchangeScale))
//   // Since the rate is in the unit of exchange (e.g. BTC, ETH),
//   // it must be converted to scale of the given unit
//   return rate << shift
// }
 

export const $AtomicSwapExample = component((
  [fromInputValueChange, fromInputValueChangeTether]: Behavior<string, string>,
  [clickOnDivide,        clickOnDivideTether]: Behavior<IBranch, PointerEvent>,
  [divideBySlider,       divideByPercentageTether]: Behavior<number, number>,
  [switchTokenSource,    switchTokenSourceTether]: Behavior<Token, Token>,
) => {


  const initialTokenValue = tokenList[0]
  const token = state.replayLatest(switchTokenSource, initialTokenValue)
  const balanceChange = map(t => t.balance, token)

  const fromInputValueChangeWithInitial = merge(fromInputValueChange, constant(0, switchTokenSource))

  const divideByInput = snapshot((balance, change) =>
    1 - (balance - Number(change)) / balance
  , balanceChange, fromInputValueChangeWithInitial)

  const divideBalanceBySlider = snapshot((balance, divide) => balance * divide, balanceChange, divideBySlider)

  const allDivideControls = merge(divideBySlider, divideByInput)

  // state replay
  const replayDivideControls = state.replayLatest(allDivideControls, 0)


  const $allocateDivisionPopover = $column(
    $Slider({ value: replayDivideControls })({
      change: divideByPercentageTether()
    })
  )


  return [
    $column(layoutSheet.spacing)(

      $alert('WIP - to be fully integrated with uniswap contract soon.  ... .. (:'),
      $text('Uniswap Client with some UX improvments. token balance is constantly being synced with an ethereum provider(metamask or walletconnect)'),

      $card(layoutSheet.spacingBig, elevation2, style({ borderRadius: '30px', padding: '30px' }))(

        $Popover({ $$popContent: constant($allocateDivisionPopover, clickOnDivide) })(
          $row(style({ alignItems: 'center' }))(
            $TokenInput({ token: token, changeInput: divideBalanceBySlider })({
              change: fromInputValueChangeTether(),
              switchToken: switchTokenSourceTether()
            }),
            clickOnDivideTether(event('click'))(
              $gaugeMetric({ value: replayDivideControls, size: '28px', styleCSS: { height: '100%', cursor: 'pointer' } })
            )
          )
        )({}),

        $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
          $column(style({ flex: 1, borderBottom: `1px solid ${pallete.middleground}` }))(),
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $text(style({ color: pallete.foreground, fontSize: '75%' }))('Swap into'),
            $icon({ $content: $caretDblDown, width: 10, viewBox: '0 0 32 32' }),
          ),
          $column(style({ flex: 1, borderBottom: `1px solid ${pallete.middleground}` }))(),
        ),

        $TokenInput({ token: now(tokenList[2]), changeInput: empty() })({}),

        $row(style({ placeContent: 'center' }))(
          $Button({ $content: $text('Swap') })({})
        )
      )
    )
  ]
})


