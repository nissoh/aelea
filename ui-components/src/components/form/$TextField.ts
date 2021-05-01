import { $text, Behavior, component, IBranch, O, Op, style, StyleCSS } from '@aelea/core'
import { pallete } from '@aelea/ui-components-theme'
import { empty, map, merge, multicast, never, now, sample, skipRepeats, switchLatest } from '@most/core'
import { $row } from "../../elements/$elements"
import layoutSheet from '../../style/layoutSheet'
import { $Field, Field } from "./$Field"
import { $label } from "./form"

export interface TextField extends Field {
  label: string
  hint?: string
  labelStyle?: StyleCSS

  containerOp?: Op<IBranch<HTMLInputElement>, IBranch<HTMLInputElement>>
}

export const $TextField = (config: TextField) => component((
  [change, valueTether]: Behavior<string, string>,
  [blur, blurTether]: Behavior<FocusEvent, FocusEvent>,
) => {
  const { hint } = config
  const multicastValidation = config.validation ? O(config.validation, src => sample(src, blur), multicast) : undefined
  const fieldOp = config.containerOp ?? O()
  const validation = multicastValidation ? skipRepeats(multicastValidation(change)) : never()

  const $messageLabel = $text(style({ fontSize: '75%', width: '100%' }))
  const $hint = hint ? now($messageLabel(hint)) : never()

  const $alert = map(msg => {
    if (msg) {
      const negativeStyle = style({ color: pallete.negative })
      return negativeStyle($messageLabel(msg) as any)
    }
    return hint ? $messageLabel(hint) : empty()
  }, validation)

  const $message = switchLatest(merge($hint, $alert))

  return [
    $row(fieldOp, style({ alignItems: 'flex-start' }))(
      $label(layoutSheet.flex, layoutSheet.spacingTiny)(
        $row(layoutSheet.flex, layoutSheet.spacingSmall)(
          $text(style({ alignSelf: 'flex-end', paddingBottom: '1px', ...config.labelStyle }))(config.label),
          $Field({ ...config, validation: multicastValidation })({
            change: valueTether(),
            blur: blurTether()
          })
        ),
        $message
      )
    ),

    { change, }
  ]
})