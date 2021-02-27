import { map, mergeArray } from "@most/core"
import { $element, $node, attr, Behavior, component, IBranch, event, O, style, styleBehavior, attrBehavior } from '@aelea/core'
import * as designSheet from '../../common/stylesheet'
import { dismissOp, Input, interactionOp } from "./form"



export interface Checkbox extends Input<boolean> {
}

export default ({ value }: Checkbox) => component((
  [interactionBehavior, focusStyle]: Behavior<IBranch, true>,
  [dismissBehavior, dismissstyle]: Behavior<IBranch, false>,
  [sampleCheck, check]: Behavior<IBranch<HTMLInputElement>, boolean>
) => {

  const $overlay = $node(
    designSheet.stretch,
    style({ flex: 1, margin: '3px', }),
    styleBehavior(
      map(ch => ch ? { backgroundColor: designSheet.theme.text } : null, value)
    ),
  )

  const $checkInput = $element('input')(
    style({ opacity: 0, width: 'inherit', height: 'inherit', margin: '0', cursor: 'pointer', }),
    designSheet.stretch,
    sampleCheck(
      event('change'),
      map(evt => (<HTMLInputElement>evt.target).checked),
    ),
    attr({ type: 'checkbox' }),
    attrBehavior(
      map(checked => ({ checked }), value)
    ),
    interactionBehavior(interactionOp),
    dismissBehavior(dismissOp),
  )


  const containerStyle = O(
    styleBehavior(
      map(
        active => active ? { borderColor: designSheet.theme.primary } : null,
        mergeArray([focusStyle, dismissstyle])
      )
    ),
    style({ position: 'relative', width: '18px', height: '18px', border: `2px solid ${designSheet.theme.base}` }),
  )

  return [
    $node(containerStyle)(
      $overlay(),
      $checkInput()
    ),
    { check }
  ]
})
