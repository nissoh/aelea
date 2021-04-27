import { $element, attr, Behavior, component, event, IAttrProperties, IBranch, O, style, styleBehavior, StyleCSS } from '@aelea/core'
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
  placeholder?: string
  name?: string
  autocomplete?: boolean
  fieldStyle?: StyleCSS
  attributes?: IAttrProperties<{}>
}

export const $Field = ({ type = InputType.TEXT, value = empty(), name, placeholder, autocomplete = true, fieldStyle = {}, validation = never, attributes = {} }: Field) => component((
  [interactionBehavior, focusStyle]: Behavior<IBranch, true>,
  [dismissBehavior, dismissstyle]: Behavior<IBranch, false>,
  [sampleBlur, blur]: Behavior<IBranch, FocusEvent>,
  [sampleChange, change]: Behavior<IBranch<HTMLInputElement>, string>
) => {

  const multicastValidation = O(validation, startWith(''), multicast)

  const alert = multicastValidation(change)

  const focus = merge(focusStyle, dismissstyle)
  const state = combineState({ focus, alert })

  return [
    $element('input')(
      attr({ name, type, placeholder, autocomplete: autocomplete ? null : 'off', ...attributes }),
      designSheet.input,
      style(fieldStyle),

      sampleChange(
        event('input'),
        map(inputEv => {
          if (inputEv.target instanceof HTMLInputElement) {
            const text = inputEv.target.value
            return text || ''
          }
          return ''
        })
      ),

      styleBehavior(
        map(({ focus, alert }) => {
          if (alert) {
            return { borderBottom: `2px solid ${pallete.negative}` }
          }

          return focus ? { borderBottom: `2px solid ${pallete.primary}` } : null
        }, state)
      ),

      interactionBehavior(interactionOp),
      dismissBehavior(dismissOp),

      sampleBlur(event('blur')),

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