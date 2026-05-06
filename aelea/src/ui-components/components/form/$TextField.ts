import type { IStream } from '../../../stream/index.js'
import { empty, just, map, merge, never, op, sample, skipRepeats, switchLatest } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { multicast } from '../../../stream-extended/index.js'
import { palette, text } from '../../../ui-components-theme/index.js'
import { $element, $node, $text, component, type INodeCompose, style } from '../../../ui-renderer-dom/index.js'
import { $row } from '../../elements/$elements.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { spacing } from '../../style/spacing.js'
import { $Input, type IInput } from './$Input.js'

// $container IS the label element. Defaults to a styled <label> so clicking
// it focuses the inner input; override with any INodeCompose for fully
// custom outer markup (different tag, layout, theming).
export const $defaultTextFieldContainer = $element('label')(
  layoutSheet.column,
  spacing.tiny,
  style({ color: palette.foreground, alignItems: 'flex-start' })
)

// Inner row holding the label text + input.
export const $defaultTextFieldLabelRow = $row(
  spacing.small,
  style({ alignSelf: 'stretch', alignItems: 'baseline', cursor: 'pointer', paddingBottom: '1px' })
)

export interface TextField extends IInput {
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

      const $messageLabel = $node(style({ fontSize: text.xs, width: '100%' }))
      const $hint = hint ? just($messageLabel($text(hint))) : never

      const $alert = map(msg => {
        if (msg) {
          const negativeStyle = style({ color: palette.negative })
          return negativeStyle($messageLabel($text(msg)) as any)
        }
        return hint ? $messageLabel($text(hint)) : empty
      }, validation)

      const $message = switchLatest(merge($hint, $alert))

      return [
        $container(
          $labelRow(
            $text(config.label),
            $Input({ ...config, validation: multicastValidation })({
              change: valueTether(),
              blur: blurTether()
            })
          ),
          $message
        ),
        { change }
      ]
    }
  )
