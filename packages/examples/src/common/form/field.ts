import { component, Behavior, $text } from "fufu";
import { $column } from "../common";
import { Input, $label } from "../form";
import { $Input } from "./input";
import * as designSheet from '../style/stylesheet'

export interface Field extends Input {
  label: string
}

export const $Field = (props: Field) => component((
  [sampleValue, value]: Behavior<string, string>
) => [

    $label(designSheet.flex)(
      $column(designSheet.flex)(
        $text(props.label),
        $Input(props)({
          value: sampleValue()
        })
      )
    ),

    {
      value
    }

  ]
)