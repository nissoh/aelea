import type { IStream } from '../../../stream/index.js'
import { empty, just, map, merge, never, op, sample, skipRepeats, switchLatest } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { multicast } from '../../../stream-extended/index.js'
import { pallete } from '../../../ui-components-theme/index.js'
import { $node, $text, component, type INodeCompose, style } from '../../../ui-renderer-dom/index.js'
import { $row } from '../../elements/$elements.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { spacing } from '../../style/spacing.js'
import { $Field, type Field } from './$Field.js'
import { $label } from './form.js'

export const $defaultTextFieldContainer = $row(style({ alignItems: 'flex-start' }))

// Inner row holding label + input. `cursor: pointer` so clicking the label focuses the input.
export const $defaultTextFieldLabelRow = $row(
  layoutSheet.flex,
  spacing.small,
  style({ alignSelf: 'flex-end', cursor: 'pointer', paddingBottom: '1px' })
)

export interface TextField extends Field {
  label: string
  hint?: string
  $container?: INodeCompose
  $labelRow?: INodeCompose
}

export const $TextField = (config: TextField) =>
  component(
    ([change, valueTether]: IBehavior<string, string>, [blur, blurTether]: IBehavior<FocusEvent, FocusEvent>) => {
      const { hint, $container = $defaultTextFieldContainer, $labelRow = $defaultTextFieldLabelRow } = config

      const multicastValidation = config.validation
        ? (src: any) => op(src, config.validation!, (s: any) => sample(s, blur), multicast)
        : undefined
      const validation: IStream<string | null> = multicastValidation ? skipRepeats(multicastValidation(change)) : never

      const $messageLabel = $node(style({ fontSize: '75%', width: '100%' }))
      const $hint = hint ? just($messageLabel($text(hint))) : never

      const $alert = map(msg => {
        if (msg) {
          const negativeStyle = style({ color: pallete.negative })
          return negativeStyle($messageLabel($text(msg)) as any)
        }
        return hint ? $messageLabel($text(hint)) : empty
      }, validation)

      const $message = switchLatest(merge($hint, $alert))

      return [
        $container(
          $label(layoutSheet.flex, spacing.tiny)(
            $labelRow(
              $text(config.label),
              $Field({ ...config, validation: multicastValidation })({
                change: valueTether(),
                blur: blurTether()
              })
            ),
            $message
          )
        ),
        { change }
      ]
    }
  )
