import { $text, Behavior, component } from "fufu";
import { $column } from "../../common/common";
import { $label, Input } from "../../common/form";
import * as designSheet from '../../common/stylesheet';
import $Input from "./$Input";

export interface Field extends Input {
  label: string
}

export default (props: Field) => component((
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