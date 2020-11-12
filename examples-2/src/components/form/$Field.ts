import { $text, Behavior, component } from '@aelea/core';
import { $column } from "../../common/common";
import * as designSheet from '../../common/stylesheet';
import $Input, { Input } from "./$Input";
import { $label } from "./form";

export interface Field extends Input {
  label: string
}

export default (config: Field) => component((
  [sampleValue, value]: Behavior<string, string>
) => [

    $label(designSheet.flex)(
      $column(designSheet.flex)(
        $text(config.label),
        $Input(config)({
          value: sampleValue()
        })
      )
    ),

    {
      value
    }

  ]
)