import { component } from '../../../core/combinator/component.js'
import type { IStyleCSS } from '../../../core/combinator/style.js'
import { style } from '../../../core/combinator/style.js'
import { $node } from '../../../core/source/node.js'
import { $text } from '../../../core/source/text.js'
import type { INode } from '../../../core/types.js'
import type { IBehavior, IOps } from '../../../stream/index.js'
import {
  empty,
  map,
  merge,
  multicast,
  never,
  now,
  o,
  sample,
  skipRepeats,
  switchLatest
} from '../../../stream/index.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { $row } from '../../elements/$elements.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { spacing } from '../../style/spacing.js'
import { $Field, type Field } from './$Field.js'
import { $label } from './form.js'

export interface TextField extends Field {
  label: string
  hint?: string
  labelStyle?: IStyleCSS

  containerOp?: IOps<INode<HTMLInputElement>, INode<HTMLInputElement>>
}

export const $TextField = (config: TextField) =>
  component(
    ([change, valueTether]: IBehavior<string, string>, [blur, blurTether]: IBehavior<FocusEvent, FocusEvent>) => {
      const { hint } = config
      const multicastValidation = config.validation
        ? o(config.validation, src => sample(src, blur), multicast)
        : undefined
      const fieldOp = config.containerOp ?? o()
      const validation = multicastValidation ? skipRepeats(multicastValidation(change)) : never

      const $messageLabel = $node(style({ fontSize: '75%', width: '100%' }))
      const $hint = hint ? now($messageLabel($text(hint))) : never

      const $alert = map(msg => {
        if (msg) {
          const negativeStyle = style({ color: pallete.negative })
          return negativeStyle($messageLabel($text(msg)) as any)
        }
        return hint ? $messageLabel($text(hint)) : empty
      }, validation)

      const $message = switchLatest(merge($hint, $alert))

      return [
        $row(
          fieldOp,
          style({ alignItems: 'flex-start' })
        )(
          $label(layoutSheet.flex, spacing.tiny)(
            $row(
              layoutSheet.flex,
              spacing.small,
              style({
                alignSelf: 'flex-end',
                cursor: 'pointer',
                paddingBottom: '1px',
                ...config.labelStyle
              })
            )(
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
