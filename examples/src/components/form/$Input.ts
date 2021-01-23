import { combine, map } from "@most/core";
import { Stream } from "@most/types";
import { $element, attr, Behavior, component, IBranch, event } from '@aelea/core';
import * as designSheet from '../../common/stylesheet';
import { Control, InputType } from "./form";


export interface Input extends Control {
  type?: InputType
  setValue?: Stream<string>
  placeholder?: string | undefined
  name?: string
}

export default (config: Input) => component((
  [sampleValue, value]: Behavior<IBranch, string>
) => {

  return [
    $element('input')(
      attr({ type: config.type ?? InputType.TEXT, name: config.name }),
      designSheet.input,

      // stylePseudo(':hover', { borderColor: designSheet.theme.primary }),
      // stylePseudo(':focus', { borderColor: designSheet.theme.primary }),

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