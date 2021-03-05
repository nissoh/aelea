import { $text, Behavior, component, style } from '@aelea/core';
import { empty } from '@most/core';
import { $row } from "../../$elements";
import layoutSheet from '../../style/layoutSheet';
import { $Input, Field } from "./$Input";
import { $label } from "./form";

export interface TextField extends Field {
  label: string
  hint?: string
}

export const $TextField = (config: TextField) => component((
  [sampleValue, value]: Behavior<string, string>
) => {
  const { hint } = config

  return [
    $label(layoutSheet.flex, layoutSheet.spacingTiny, style({ alignSelf: 'self-start' }))(
      $row(layoutSheet.flex, layoutSheet.spacingSmall)(
        $text(style({ alignSelf: 'flex-end', paddingBottom: '1px' }))(config.label),
        $Input(config)({
          change: sampleValue()
        })
      ),
      hint ? $text(style({ fontSize: '75%', width: '100%' }))(hint) : empty()
    ),

    { value }
  ]
})