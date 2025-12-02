import type { IOps, IStream } from '@/stream'
import { empty, just, map, merge, never, op, sample, skipRepeats, switchLatest } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { multicast } from '@/stream-extended'
import { pallete } from '@/ui-components-theme'
import type { INode, IStyleCSS } from '@/ui-renderer-dom'
import { $node, $text, component, style } from '@/ui-renderer-dom'
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
        ? (src: any) => op(src, config.validation!, (s: any) => sample(s, blur), multicast)
        : undefined
      const fieldOp = config.containerOp ?? op
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
