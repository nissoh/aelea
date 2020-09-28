import { merge, constant, filter } from "@most/core"
import { O, NodeStream, event, $element } from "fufu"

import * as designSheet from '../style/stylesheet'

export const interactionOp = O(
  (src: NodeStream) => merge(event('focus', src), event('pointerover', src)),
  constant(true)
)

export const dismissOp = O(
  (src: NodeStream) => merge(event('blur', src), event('pointerout', src)),
  filter(x => document.activeElement !== x.target,), // focused elements cannot be dismissed
  constant(false)
)



export const $form = $element('form')(designSheet.column)



