import { constant, filter, merge } from "@most/core"
import { $ChildNode, $element, event, O } from "fufu"
import * as designSheet from '../../common/stylesheet'


export const interactionOp = O(
  (src: $ChildNode) => merge(event('focus', src), event('pointerover', src)),
  constant(true)
)

export const dismissOp = O(
  (src: $ChildNode) => merge(event('blur', src), event('pointerout', src)),
  filter(x => document.activeElement !== x.target,), // focused elements cannot be dismissed
  constant(false)
)



export const $form = $element('form')(designSheet.column)



