import type { INode, IStyleCSS } from '@/ui'
import { $element, component, nodeEvent, style, styleBehavior } from '@/ui'
import type { IOps } from '../../../stream/index.js'
import { combine, constant, empty, filter, map, merge, o, start, switchLatest, tap } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { multicast } from '../../../stream-extended/index.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
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
      [focusStyle, interactionTether]: IBehavior<INode, true>,
      [dismissstyle, dismissTether]: IBehavior<INode, false>,
      [blur, blurTether]: IBehavior<INode, FocusEvent>,
      [change, changeTether]: IBehavior<INode<HTMLInputElement>, string>
    ) => {
      const multicastValidation = o(validation, start(''), multicast)
      const alert = multicastValidation(change)
      const focus = merge(focusStyle, dismissstyle)
      const state = combine({ focus, alert })

      return [
        $element('input')(
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

          interactionTether(interactionOp),
          dismissTether(dismissOp),
          blurTether(nodeEvent('blur')),

          o(
            map((node: any) =>
              start(
                node,
                filter(
                  () => false,
                  tap(val => {
                    if ('value' in node.element) {
                      ;(node.element as HTMLInputElement).value = String(val)
                    }
                  }, value)
                )
              )
            ),
            switchLatest
          )
        )(),

        {
          change,
          blur
        }
      ]
    }
  )
