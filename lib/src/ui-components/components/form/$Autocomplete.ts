import { empty, map, mergeArray, snapshot } from "@most/core"
import type { Behavior } from "../../../core/types.js"
import { $element, attr, component, nodeEvent, styleBehavior } from "../../../dom/index.js"
import type { IBranch } from "../../../dom/types.js"
import { pallete } from "../../../ui-components-theme/globalState.js"
import { designSheet } from "../../index.js"
import { dismissOp, interactionOp } from "./form.js"
import { InputType, type Input } from "./types.js"



export interface Autocomplete extends Input<string | number> {
  type?: InputType
  placeholder?: string
  name?: string
}

export const $Autocomplete = ({ type = InputType.TEXT, value = empty(), name, placeholder }: Autocomplete) => component((
  [focus, focusTether]: Behavior<IBranch, true>,
  [dismissstyle, dismissTether]: Behavior<IBranch, false>,
  [change, changeTether]: Behavior<IBranch<HTMLInputElement>, string>
) => {

  return [
    $element('input')(
      attr({ name, type, placeholder }),
      designSheet.input,

      changeTether(
        nodeEvent('input'),
        map(inputEv => {
          if (inputEv.target instanceof HTMLInputElement) {
            const text = inputEv.target.value
            return text || ''
          }
          return ''
        })
      ),

      styleBehavior(
        map(
          active => active ? { borderBottom: `1px solid ${pallete.primary}` } : null,
          mergeArray([focus, dismissstyle])
        )
      ),

      focusTether(interactionOp),
      dismissTether(dismissOp),

      changeTether(
        inputNode => snapshot((node, text) => {
          // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
          node.element.value = String(text)
          return text
        }, inputNode, value)
      )

    )(),

    {
      change
    }
  ]
})