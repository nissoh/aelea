import { attr, attrBehavior, Behavior, component, event, INode, O, style } from "@aelea/core"
import { $row, layoutSheet, $icon, $Popover, $Field } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, merge, multicast, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { Token } from "./types"
import { tokenList } from './state'
import { $caretDown } from "./common"
import { $TokenList } from "./$tokenList"



interface CoinInput {
  token: Stream<Token>
  changeInput: Stream<number>
  // field: Field
}


export const $TokenInput = ({ token, changeInput }: CoinInput) => component((
  [change, changeTether]: Behavior<any, any>,
  [switchTokenPopover, switchTokenPopoverTether]: Behavior<INode, PointerEvent>,
  [switchToken, switchTokenTether]: Behavior<Token, Token>,
) => {

  const $tokenList = $TokenList(tokenList)({
    choose: switchTokenTether(multicast)
  })

  const value = merge(constant('', token), changeInput)

  return [
    $row(layoutSheet.spacingBig, style({ alignItems: 'center', flex: 1 }))(
    
      $Popover({
        $$popContent: constant($tokenList, switchTokenPopover),
        dismiss: switchToken
        // overlayBackgroundColor: pallete.background
      })(
        $row(switchTokenPopoverTether(event('click')), layoutSheet.spacingSmall, style({ alignItems: 'center', cursor: 'pointer' }))(
          $icon({ $content: switchLatest(map(t => t.$icon, token)), fill: pallete.message, width: 42, viewBox: '0 0 32 32' }),
          $icon({ $content: $caretDown, width: 10, viewBox: '0 0 32 19.43' })
        )
      )({}),

      $Field({
        value,
        fieldStyle: { borderBottomColor: 'transparent', fontWeight: 'bolder', fontSize: '150%' },
        inputOp: O(
          attr({ pattern: '^[0-9]*[.,]?[0-9]*$', inputmode: 'decimal' }),
          attrBehavior(
            map(t => ({ placeholder: t.balance }), token)
          )
        )
      })({
        change: changeTether()
      })
    ),

    { change, switchToken }
  ]
})