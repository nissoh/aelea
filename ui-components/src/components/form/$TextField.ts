import { $text, Behavior, component, O, style, StyleCSS } from '@aelea/core'
import { pallete } from '@aelea/ui-components-theme'
import { empty, map, merge, multicast, never, now, skipRepeats, switchLatest } from '@most/core'
import { $row } from "../../$elements"
import layoutSheet from '../../style/layoutSheet'
import { $Field, Field } from "./$Field"
import { $label } from "./form"

export interface TextField extends Field {
  label: string
  hint?: string
  labelStyle?: StyleCSS
}

export const $TextField = (config: TextField) => component((
  [sampleValue, change]: Behavior<string, string>
) => {
  const { hint } = config

  const multicastValidation = config.validation ? O(config.validation, multicast) : undefined
  const validation = multicastValidation ? skipRepeats(multicastValidation(change)) : never()

  const $messageLabel = $text(style({ fontSize: '75%', width: '100%' }))
  const $hint = hint ? now($messageLabel(hint)) : never()
  const $alert = map(msg => {
    const newLocal = style({ color: pallete.negative })
    
    if (msg) {
      return newLocal($messageLabel(msg) as any)
    }

    return hint ? $messageLabel(hint) : empty()
  }, validation)

  const $message = switchLatest(merge($hint, $alert))

  return [
    $label(layoutSheet.flex, layoutSheet.spacingTiny, style({ alignSelf: 'self-start' }))(
      $row(layoutSheet.flex, layoutSheet.spacingSmall)(
        $text(style({ alignSelf: 'flex-end', paddingBottom: '1px', ...config.labelStyle }))(config.label),
        $Field({ ...config, validation: multicastValidation })({
          change: sampleValue()
        })
      ),
      $message
    ),

    { change }
  ]
})