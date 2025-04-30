import { empty, never, startWith, multicast, merge, now, filter, tap, switchLatest, map } from "@most/core"
import { O } from "../../../core/common.js"
import type { Op, Behavior } from "../../../core/types.js"
import { component, $element, style, nodeEvent, styleBehavior } from "../../../dom/index.js"
import type { StyleCSS, IBranch } from "../../../dom/types.js"
import { designSheet } from "../../index.js"
import { interactionOp, dismissOp } from "./form.js"
import type { Input, InputType } from "./types.js"


export interface Field extends Input<string | number> {
  type?: InputType
  name?: string
  fieldStyle?: StyleCSS

  inputOp?: Op<IBranch, IBranch>
}

export const $Field = ({ value = empty(), fieldStyle = {}, validation = never, inputOp = O() }: Field) => component((
  [focusStyle, interactionTether]: Behavior<IBranch, true>,
  [dismissstyle, dismissTether]: Behavior<IBranch, false>,
  [blur, blurTether]: Behavior<IBranch, FocusEvent>,
  [change, changeTether]: Behavior<IBranch<HTMLInputElement>, string>
) => {

  const multicastValidation = O(validation, startWith(''), multicast)

  const alert = multicastValidation(change)

  const focus = merge(focusStyle, dismissstyle)
  const state = combineObject({ focus, alert })

  return [
    $element('input')(
      designSheet.input,
      style(fieldStyle),

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

      inputOp,

      styleBehavior(
        map(({ focus, alert }) => {
          if (alert) {
            return { borderBottom: `2px solid ${pallete.negative}` }
          }

          return focus ? { borderBottom: `2px solid ${pallete.primary}` } : null
        }, state)
      ),

      interactionTether(interactionOp),
      dismissTether(dismissOp),

      blurTether(nodeEvent('blur')),

      O(
        map(node =>
          merge(
            now(node),
            filter(() => false, tap(val => {
              // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
              node.element.value = String(val)
            }, value))
          )
        ),
        switchLatest
      )

    )(),

    {
      change,
      blur
    }
  ]
})