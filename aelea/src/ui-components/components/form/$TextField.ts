import {
  empty,
  map,
  merge,
  multicast,
  never,
  now,
  sample,
  skipRepeats,
  switchLatest,
} from '@most/core'
import { O } from '../../../core/common.js'
import type { Behavior, Op } from '../../../core/types.js'
import { component } from '../../../dom/combinators/component.js'
import { style } from '../../../dom/combinators/style.js'
import { $text } from '../../../dom/source/node.js'
import type { IBranch, IStyleCSS } from '../../../dom/types.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { $row } from '../../elements/$elements.js'
import { flex } from '../../style/layoutSheet.js'
import { spacing } from '../../style/spacing.js'
import { $Field, type Field } from './$Field.js'
import { $label } from './form.js'

export interface TextField extends Field {
  label: string
  hint?: string
  labelStyle?: IStyleCSS

  containerOp?: Op<IBranch<HTMLInputElement>, IBranch<HTMLInputElement>>
}

export const $TextField = (config: TextField) =>
  component(
    (
      [change, valueTether]: Behavior<string, string>,
      [blur, blurTether]: Behavior<FocusEvent, FocusEvent>,
    ) => {
      const { hint } = config
      const multicastValidation = config.validation
        ? O(config.validation, (src) => sample(src, blur), multicast)
        : undefined
      const fieldOp = config.containerOp ?? O()
      const validation = multicastValidation
        ? skipRepeats(multicastValidation(change))
        : never()

      const $messageLabel = $text(style({ fontSize: '75%', width: '100%' }))
      const $hint = hint ? now($messageLabel(hint)) : never()

      const $alert = map((msg) => {
        if (msg) {
          const negativeStyle = style({ color: pallete.negative })
          return negativeStyle($messageLabel(msg) as any)
        }
        return hint ? $messageLabel(hint) : empty()
      }, validation)

      const $message = switchLatest(merge($hint, $alert))

      return [
        $row(
          fieldOp,
          style({ alignItems: 'flex-start' }),
        )(
          $label(flex, spacing.tiny)(
            $row(flex, spacing.small)(
              $text(
                style({
                  alignSelf: 'flex-end',
                  cursor: 'pointer',
                  paddingBottom: '1px',
                  ...config.labelStyle,
                }),
              )(config.label),
              $Field({ ...config, validation: multicastValidation })({
                change: valueTether(),
                blur: blurTether(),
              }),
            ),
            $message,
          ),
        ),

        { change },
      ]
    },
  )
