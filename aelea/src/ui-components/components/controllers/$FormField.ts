import { combine, type IStream, just, map, switchLatest } from '../../../stream/index.js'
import { multicast } from '../../../stream-extended/index.js'
import { palette, text } from '../../../ui-components-theme/index.js'
import {
  $element,
  $text,
  type I$Slottable,
  type INodeCompose,
  style,
  styleBehavior
} from '../../../ui-renderer-dom/index.js'
import { spacing } from '../../style/spacing.js'

export interface I$FormField {
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

  const state = multicast(
    combine({
      v: validation ?? just<string | null>(null),
      h: hint ?? just('')
    })
  )

  return $defaultFormFieldMessage(
    styleBehavior(map(s => ({ color: s.v ? palette.negative : palette.foreground }), state))
  )(switchLatest(map(s => $text(s.v ?? s.h ?? ''), state)))
}

export const $FormField = ({
  $control,
  label,
  validation,
  hint,
  $container = $defaultFormFieldContainer
}: I$FormField): I$Slottable => {
  const $labelSlot = label ? $defaultFormFieldLabel($text(label)) : $defaultFormFieldLabel()
  const $messageSlot = buildMessageSlot(validation, hint)

  return $container($labelSlot, $control, $messageSlot)
}
