import type { IOps } from '@/stream'
import { combine, constant, empty, map, merge, o, start } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { multicast } from '@/stream-extended'
import { pallete } from '@/ui-components-theme'
import type { I$Node, INode, IStyleCSS } from '@/ui-renderer-dom'
import { $element, component, effectProp, nodeEvent, style, styleBehavior } from '@/ui-renderer-dom'
import { designSheet } from '../../style/designSheet.js'
import { dismissNodeOp, interactionNodeOp } from './form.js'
import type { Input, InputType } from './types.js'

export interface Field extends Input<string | number> {
  type?: InputType
  name?: string
  fieldStyle?: IStyleCSS
  inputOp?: IOps<INode>
}

export const $Field = ({ value = empty, fieldStyle = {}, validation = constant(null), inputOp = o() }: Field) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<I$Node, boolean>,
      [dismissstyle, dismissTether]: IBehavior<I$Node, boolean>,
      [blur, blurTether]: IBehavior<INode, FocusEvent>,
      [change, changeTether]: IBehavior<INode<HTMLInputElement>, string>
    ) => {
      const multicastValidation = o(validation, start(''), multicast)
      const alert = multicastValidation(change)
      const focus = merge(focusStyle, dismissstyle)
      const state = combine({ focus, alert })

      const $input = $element('input')
      return [
        $input(
          designSheet.input,
          style(fieldStyle),

          changeTether(
            nodeEvent('input'),
            map(inputEv => {
              if (inputEv.target instanceof HTMLInputElement) {
                const text = inputEv.target.value
                return text || ''
              }
              return ''
            })
          ),

          inputOp,

          styleBehavior(
            map(({ focus, alert }) => {
              if (alert) {
                return { borderBottom: `2px solid ${pallete.negative}` }
              }

              return focus ? { borderBottom: `2px solid ${pallete.primary}` } : null
            }, state)
          ),

          interactionTether(interactionNodeOp),
          dismissTether(dismissNodeOp),
          blurTether(nodeEvent('blur')),
          effectProp('value', value)
        )(),

        {
          change,
          blur
        }
      ]
    }
  )
