import { attrBehavior, component, nodeEvent, INode, style } from '@aelea/dom'
import { Behavior, O } from "@aelea/core"
import { $row, layoutSheet, $icon, $Popover, $Field, $column } from "@aelea/ui-components"
import { constant, map, merge, multicast, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { Token } from "../types"
import { tokenList } from '../state'
import { $caretDown } from "../$elements"
import { $TokenList } from "./$tokenList"



interface CoinInput {
  token: Stream<Token>
  changeInput: Stream<string>
  // field: Field
}


export const $TokenInput = ({ token, changeInput }: CoinInput) => component((
  [change, changeTether]: Behavior<string, string>,
  [switchTokenPopover, switchTokenPopoverTether]: Behavior<INode, PointerEvent>,
  [switchToken, switchTokenTether]: Behavior<Token, Token>,
) => {

  const $tokenList = $TokenList(tokenList)({
    choose: switchTokenTether(multicast)
  })

  const value = merge(constant('', token), changeInput)

  const selectedBalance = switchLatest(
    map(token => {
      return token.contract.balanceReadable
    }, token)
  )

  return [
    $row(layoutSheet.spacing, style({ alignItems: 'center', flex: 1 }))(
    
      $Popover({
        $$popContent: constant($tokenList, switchTokenPopover),
        dismiss: switchToken
        // overlayBackgroundColor: pallete.background
      })(
        $row(switchTokenPopoverTether(nodeEvent('click')), layoutSheet.spacingSmall, style({ alignItems: 'center', cursor: 'pointer' }))(
          // switchLatest(map(t => style({ width: '48px', height: '48x' }, t.$icon), token)),
          $icon({ $content: $caretDown, width: '10px', viewBox: '0 0 32 19.43' })
        )
      )({}),

      $column(
        $Field({
          value,
          fieldStyle: { borderBottomColor: 'transparent', fontWeight: 'bolder', fontSize: '1.55em' },
          inputOp: O(
            attrBehavior(
              map(placeholder => {
                return { placeholder }
              }, selectedBalance)
            )
          )
        })({
          change: changeTether()
        }),
      )
    ),

    { change, switchToken }
  ]
})