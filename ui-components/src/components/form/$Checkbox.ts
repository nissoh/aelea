import { map, mergeArray } from "@most/core"
import { $element, $node, attr, Behavior, component, IBranch, event, O, style, styleBehavior, attrBehavior } from '@aelea/core'
import { dismissOp, interactionOp } from "./form"
import { pallete } from "@aelea/ui-components-theme"
import layoutSheet from "../../style/layoutSheet"
import { Input } from "./types"


export interface Checkbox extends Input<boolean> {
}

export const $Checkbox = ({ value }: Checkbox) => component((
  [interactionBehavior, focusStyle]: Behavior<IBranch, true>,
  [dismissBehavior, dismissstyle]: Behavior<IBranch, false>,
  [sampleCheck, check]: Behavior<IBranch<HTMLInputElement>, boolean>
) => {

  const $overlay = $node(
    layoutSheet.stretch,
    style({ flex: 1, margin: '3px', }),
    styleBehavior(
      map(ch => ch ? { backgroundColor: pallete.message } : null, value)
    ),
  )

  const $checkInput = $element('input')(
    style({ opacity: 0, width: 'inherit', height: 'inherit', margin: '0', cursor: 'pointer', }),
    layoutSheet.stretch,
    sampleCheck(
      event('change'),
      map(evt => (<HTMLInputElement>evt.target).checked),
    ),
    attr({ type: 'checkbox' }),
    attrBehavior(
      map(checked => ({ checked: checked ? true : null }), value)
    ),
    interactionBehavior(interactionOp),
    dismissBehavior(dismissOp),
  )


  const containerStyle = O(
    styleBehavior(
      map(
        active => active ? { borderColor: pallete.primary } : null,
        mergeArray([focusStyle, dismissstyle])
      )
    ),
    style({ position: 'relative', width: '18px', height: '18px', border: `2px solid ${pallete.message}` }),
  )

  return [
    $node(containerStyle)(
      $overlay(),
      $checkInput()
    ),
    { check }
  ]
})
