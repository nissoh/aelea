import { $text, Behavior, component } from '@aelea/core';
import { $column } from "../../common/common";
import * as designSheet from '../../common/stylesheet';
import $Input, { Field } from "./$Input";
import { $label } from "./form";

export interface TextField extends Field {
  label: string
}

export default (config: TextField) => component((
  [sampleValue, value]: Behavior<string, string>
) => {
  return [
    $label(designSheet.flex)(
      $column(designSheet.flex)(
        $text(config.label),
        $Input(config)({
          change: sampleValue()
        })
      )
    ),

    { value }
  ]
})