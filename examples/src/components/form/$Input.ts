import { $element, attr, Behavior, component, event, IBranch, styleBehavior } from '@aelea/core';
import { combine, map, mergeArray } from "@most/core";
import { Stream } from "@most/types";
import * as designSheet from '../../common/stylesheet';
import { Control, dismissOp, InputType, interactionOp } from "./form";


export interface Input extends Control {
  type?: InputType
  setValue?: Stream<string>
  placeholder?: string | undefined
  name?: string
}

export default (config: Input) => component((
  [interactionBehavior, focusStyle]: Behavior<IBranch, true>,
  [dismissBehavior, dismissstyle]: Behavior<IBranch, false>,
  [sampleValue, value]: Behavior<IBranch, string>
) => {

  return [
    $element('input')(
      attr({ type: config.type ?? InputType.TEXT, name: config.name }),
      designSheet.input,

      sampleValue(
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

      // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
      (source) => config.setValue
        ? combine((inputEl, val) => {
          inputEl.element.value = val
          return inputEl
        }, source, config.setValue)
        : source
    )(),

    {
      value
    }
  ]
})