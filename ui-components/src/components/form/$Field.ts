import { $element, Behavior, component, event, IBranch, O, Op, style, styleBehavior, StyleCSS } from '@aelea/core'
import { pallete } from '@aelea/ui-components-theme'
import { multicast, never, now, startWith, tap } from '@most/core'
import { filter } from '@most/core'
import { merge } from '@most/core'
import { empty, map, switchLatest } from "@most/core"
import designSheet from '../../style/designSheet'
import { combineState } from '../../utils/state'
import { dismissOp, interactionOp } from "./form"
import { Input, InputType } from './types'

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
  const state = combineState({ focus, alert })

  return [
    $element('input')(
      designSheet.input,
      style(fieldStyle),

      changeTether(
        event('input'),
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

      blurTether(event('blur')),

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