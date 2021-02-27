import { $element, attr, Behavior, component, event, IBranch, styleBehavior } from '@aelea/core';
import { empty, map, mergeArray, snapshot } from "@most/core";
import * as designSheet from '../../common/stylesheet';
import { dismissOp, Input, InputType, interactionOp } from "./form";


export interface Field extends Input<string | number> {
  type?: InputType
  placeholder?: string
  name?: string
}

export default ({ type = InputType.TEXT, value = empty(), name, placeholder }: Field) => component((
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
            return text || '';
          }
          return ''
        })
      ),

      styleBehavior(
        map(
          active => active ? { borderBottom: `2px solid ${designSheet.theme.primary}` } : null,
          mergeArray([focusStyle, dismissstyle])
        )
      ),

      interactionBehavior(interactionOp),
      dismissBehavior(dismissOp),

      sampleChange(
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