import { map, empty, mergeArray, merge } from "@most/core"
import { component, Behavior, ContainerDomNode, $element, style, attr, event, $node, O } from "fufu"
import { Control } from "../../common/form"
import { interactionOp, dismissOp } from "./form.common"

import * as designSheet from '../../common/stylesheet'
import { Stream } from "@most/types"


export interface Checkbox extends Control {
  setCheck?: Stream<boolean>
}

export default (props: Checkbox) => component((
  [interactionBehavior, focusStyle]: Behavior<ContainerDomNode, true>,
  [dismissBehavior, dismissstyle]: Behavior<ContainerDomNode, false>,
  [sampleCheck, check]: Behavior<ContainerDomNode<HTMLInputElement>, boolean>
) => {

  const $overlay = $node(
    designSheet.stretch,
    style({ flex: 1, margin: '3px', }),
    style(
      map(
        ch => ch ? { backgroundColor: designSheet.theme.text } : null,
        merge(check, props.setCheck || empty())
      )
    ),
  )()

  const $checkInput = $element('input')(
    style({ opacity: 0, width: 'inherit', height: 'inherit', margin: '0', cursor: 'pointer', }),
    designSheet.stretch,

    sampleCheck(
      event('change'),
      map(evt => (<HTMLInputElement>evt.target).checked),
    ),

    attr({ type: 'checkbox' }),
    attr(
      map(
        checked => ({ checked }),
        merge(props.setCheck || empty(), check)
      )
    ),
    interactionBehavior(interactionOp),
    dismissBehavior(dismissOp),

  )()


  const containerStyle = O(
    style(
      map(
        active => active ? { borderColor: designSheet.theme.primary } : null,
        mergeArray([focusStyle, dismissstyle])
      )
    ),
    style({ position: 'relative', width: '18px', height: '18px', border: `2px solid ${designSheet.theme.base}` }),
  )

  return [
    $node(containerStyle)(
      $overlay,
      $checkInput
    ),
    {
      check
    }
  ]
})
