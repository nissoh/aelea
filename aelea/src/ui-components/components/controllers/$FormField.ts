import { combine, type IStream, just, map, never, op } from '../../../stream/index.js'
import { state } from '../../../stream-extended/index.js'
import { colorWeight, palette, text } from '../../../ui-components-theme/index.js'
import {
  $element,
  $text,
  type I$Slottable,
  type INodeCompose,
  style,
  styleBehavior
} from '../../../ui-renderer-dom/index.js'
import { spacing } from '../../style/spacing.js'
import { isDisabled, resolveDisabledState } from './form.js'
import type { Control } from './types.js'

export interface I$FormField extends Control {
  $control: I$Slottable
  label?: string | IStream<string>
  validation?: IStream<string | null>
  hint?: IStream<string>
  $container?: INodeCompose<HTMLLabelElement>
}

export const $defaultFormFieldContainer = $element('label')(
  spacing.tiny,
  style({
    display: 'flex',
    flexDirection: 'column',
    color: palette.foreground
  })
)

export const $defaultFormFieldLabel = $element('span')(
  style({
    fontSize: text.sm,
    color: palette.foreground
  })
)

export const $defaultFormFieldMessage = $element('span')(
  style({
    fontSize: text.sm,
    minHeight: '1.25rem'
  })
)

const buildMessageSlot = (
  validation: IStream<string | null> | undefined,
  hint: IStream<string> | undefined
): I$Slottable => {
  if (!validation && !hint) return $defaultFormFieldMessage()

  const messageState = state()(
    combine({
      v: validation ?? just(null as string | null),
      h: hint ?? just('')
    })
  )

  return $defaultFormFieldMessage(
    styleBehavior(
      op(
        messageState,
        map(s => ({ color: s.v ? palette.negative : palette.foreground }))
      )
    )
  )(
    $text(
      op(
        messageState,
        map(s => s.v ?? s.h ?? '')
      )
    )
  )
}

export const $FormField = ({
  $control,
  label,
  validation,
  hint,
  disabled = never,
  $container = $defaultFormFieldContainer
}: I$FormField): I$Slottable => {
  const $labelSlot = label ? $defaultFormFieldLabel($text(label)) : $defaultFormFieldLabel()
  const $messageSlot = buildMessageSlot(validation, hint)

  const disabledTint = styleBehavior(
    op(
      disabled,
      resolveDisabledState,
      map(s => (isDisabled(s) ? { color: colorWeight(palette.foreground, 30), cursor: 'not-allowed' } : null))
    )
  )

  return $container(disabledTint)($labelSlot, $control, $messageSlot)
}
