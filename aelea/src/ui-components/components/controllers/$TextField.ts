import { empty, just, map, merge, never, op, switchLatest } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { colorWeight, palette, text } from '../../../ui-components-theme/index.js'
import {
  $element,
  $node,
  $text,
  component,
  type INodeCompose,
  style,
  styleBehavior
} from '../../../ui-renderer-dom/index.js'
import { $row } from '../../elements/$elements.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { spacing } from '../../style/spacing.js'
import { $Input, type I$Input } from './$Input.js'
import { isDisabled, resolveDisabledState } from './form.js'

export const $defaultTextFieldContainer = $element('label')(
  layoutSheet.column,
  spacing.tiny,
  style({ color: palette.foreground, alignItems: 'flex-start' })
)

export const $defaultTextFieldLabelRow = $row(
  spacing.small,
  style({ alignSelf: 'stretch', alignItems: 'baseline', cursor: 'pointer', paddingBottom: '1px' })
)

export interface I$TextField extends I$Input {
  label: string
  hint?: string
  $container?: INodeCompose
  $labelRow?: INodeCompose
}

export const $TextField = (config: I$TextField) =>
  component(
    ([change, valueTether]: IBehavior<string, string>, [blur, blurTether]: IBehavior<FocusEvent, FocusEvent>) => {
      const { hint, $container = $defaultTextFieldContainer, $labelRow = $defaultTextFieldLabelRow } = config
      const validation = config.validation ?? never

      const $messageLabel = $node(style({ fontSize: text.xs, width: '100%' }))
      const $hint = hint ? just($messageLabel($text(hint))) : never
      const $alert = op(
        validation,
        map(msg => {
          if (msg) return $messageLabel(style({ color: palette.negative }))($text(msg))
          return hint ? $messageLabel($text(hint)) : empty
        })
      )
      const $message = switchLatest(merge($hint, $alert))

      const disabledTint = styleBehavior(
        op(
          config.disabled ?? never,
          resolveDisabledState,
          map(s => (isDisabled(s) ? { color: colorWeight(palette.foreground, 30), cursor: 'not-allowed' } : null))
        )
      )

      return [
        $container(disabledTint)(
          $labelRow(
            $text(config.label),
            $Input(config)({
              change: valueTether(),
              blur: blurTether()
            })
          ),
          $message
        ),
        { change, blur }
      ]
    }
  )
