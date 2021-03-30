import { $element, attr, Behavior, component, event, IBranch, O, styleBehavior } from '@aelea/core'
import { theme } from '@aelea/ui-components-theme'
import { now, tap } from '@most/core'
import { filter } from '@most/core'
import { merge } from '@most/core'
import { empty, map, mergeArray, switchLatest } from "@most/core"
import designSheet from '../../style/designSheet'
import { dismissOp, Input, InputType, interactionOp } from "./form"

export interface Field extends Input<string | number> {
  type?: InputType
  placeholder?: string
  name?: string
}

export const $Field = ({ type = InputType.TEXT, value = empty(), name, placeholder }: Field) => component((
  [interactionBehavior, focusStyle]: Behavior<IBranch, true>,
  [dismissBehavior, dismissstyle]: Behavior<IBranch, false>,
  [sampleChange, change]: Behavior<IBranch<HTMLInputElement>, string>
) => {

  return [
    $element('input')(
      attr({ name, type, placeholder }),
      designSheet.input,

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
        map(
          active => active ? { borderBottom: `1px solid ${theme.primary}` } : null,
          mergeArray([focusStyle, dismissstyle])
        )
      ),

      interactionBehavior(interactionOp),
      dismissBehavior(dismissOp),

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
      change
    }
  ]
})