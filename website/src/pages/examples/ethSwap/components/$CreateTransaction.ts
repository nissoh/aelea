
import { $text, attr, component, nodeEvent, IBranch, style } from '@aelea/dom'
import { O, combineObject } from "@aelea/core"
import { state, $column, $Slider, layoutSheet, $Popover, $row, $Field, $Button } from '@aelea/ui-components'
import { switchLatest, merge, constant, snapshot, map, sample, awaitPromises, startWith, filter, mergeArray, multicast } from '@most/core'
import { $TokenInput } from './$TokenInput'
import { account } from '../api/account'
import { ITransaction } from '../api/types'
import { $gaugeMetric, $labeledDivider } from '../$elements'
import { tokenList } from '../state'
import { Token } from '../types'
import { formatFixed, isAddress, parseFixed } from '../api/utils'
import { Contract } from '@ethersproject/contracts'
import { Behavior } from '@aelea/core'

export const $CreateTransaction = component((
  [inputValueChange,     inputValueChangeTether]: Behavior<string, string>,
  [clickOnDivide,        clickOnDivideTether]: Behavior<IBranch, PointerEvent>,
  [divideBySlider,       divideBySliderTether]: Behavior<number, number>,
  [switchTokenSource,    switchTokenSourceTether]: Behavior<Token<Contract>, Token<Contract>>,
  [destination,          destinationTether]: Behavior<string, string>,
  [send,                 sendTether]: Behavior<PointerEvent, ITransaction>,
  [clipboardInput,       clipboardInputTether]: Behavior<IBranch, string>,
) => {

  const initialTokenValue = tokenList[0]
  const token = state.replayLatest(switchTokenSource, initialTokenValue)
  const balance = switchLatest(map(t => t.contract.balance, token))

  const divideBalanceReadableBySlider = snapshot((balance, divide) => {
    const balanceBN = balance.toBigInt()
    const divWithBigInt = balanceBN / 100n * (BigInt(Math.round(divide * 100)))

    return { valueReadable: formatFixed(divWithBigInt), value: divWithBigInt }
  }, balance, divideBySlider)

  const divideByInput = snapshot((balance, inputValue) => {
    return Number(formatFixed(parseFixed(inputValue))) / Number(formatFixed(balance.toBigInt()))
  }, balance, inputValueChange)

  const transaction = multicast(
    combineObject<ITransaction>({
      token,
      from: account,
      to: merge(clipboardInput, destination),
      value: mergeArray([
        map(x => x.value, divideBalanceReadableBySlider),
        map(parseFixed, inputValueChange)
      ])
    })
  )

  const sendTransaction = sample(transaction, send)

  const sliceAmount = state.replayLatest(mergeArray([divideByInput, divideBySlider]), 0)


  const $allocateDivisionPopover = $column(style({ padding: '0 0 10px' }))(
    $Slider({ value: sliceAmount  })({
      change: divideBySliderTether()
    })
  )

  return [

    $column(layoutSheet.spacingBig)(
      $Popover({
        $$popContent: constant($allocateDivisionPopover, clickOnDivide),
        padding: 50
      })(
        $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
          $TokenInput({ token: token, changeInput: map(x => x.valueReadable, divideBalanceReadableBySlider) })({
            change: inputValueChangeTether(),
            switchToken: switchTokenSourceTether()
          }),
          clickOnDivideTether(nodeEvent('click'))(
            $gaugeMetric({ value: sliceAmount, size: '36px', styleCSS: { height: '100%', cursor: 'pointer' } })
          )
        )
      )({}),

      style({ margin: '0 -30px' })(
        $labeledDivider('Send To'),
      ),

      $Field({
        value: startWith('', clipboardInput),
        fieldStyle: { borderBottomColor: 'transparent', fontWeight: 'bolder', fontSize: '88%' },
        inputOp: O(
          clipboardInputTether(
            nodeEvent('focus'),
            map(async focusEvent => navigator.clipboard.readText().catch(() => '')),
            awaitPromises,
            filter(clipBoard => isAddress(clipBoard)),
          ),
          attr({ placeholder: 'Place Address' }),
          style({ textAlign: 'center' })
        )
      })({
        change: destinationTether()
      }),

      $row(style({ placeContent: 'center' }))(
        $Button({
          $content: $text('Send'),
          disabled: startWith(true, map(s => {
            return isAddress(s.to) === false || s.value <= 0n
          }, transaction))
        })({
          click: sendTether()
        })
      )
    ),

    {
      send: sendTransaction
    }
  ]
})
 