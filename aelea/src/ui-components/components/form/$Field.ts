import { empty, filter, map, merge, multicast, never, now, startWith, switchLatest, tap } from '@most/core'
import type { IBehavior } from '../../../core/combinator/behavior.js'
import { combineState } from '../../../core/combinator/state.js'
import type { IStyleCSS } from '../../../core/combinator/style.js'
import type { IOps } from '../../../core/common.js'
import { $element, component, nodeEvent, style, styleBehavior } from '../../../core/index.js'
import type { INode } from '../../../core/source/node.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Input, InputType } from './types.js'

export interface Field extends Input<string | number> {
  type?: InputType
  name?: string
  fieldStyle?: IStyleCSS

  inputOp?: IOps<INode, INode>
}

export const $Field = ({ value = empty(), fieldStyle = {}, validation = never, inputOp = o() }: Field) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<INode, true>,
      [dismissstyle, dismissTether]: IBehavior<INode, false>,
      [blur, blurTether]: IBehavior<INode, FocusEvent>,
      [change, changeTether]: IBehavior<INode<HTMLInputElement>, string>
    ) => {
      const multicastValidation = o(validation, startWith(''), multicast)

      const alert = multicastValidation(change)

      const focus = merge(focusStyle, dismissstyle)
      const state = combineState({ focus, alert })

      return [
        $element('input')(
          designSheet.input,
          style(fieldStyle),

          changeTether(
            nodeEvent('input'),
            map((inputEv) => {
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
            map((node) =>
              merge(
                now(node),
                filter(
                  () => false,
                  tap((val) => {
                    // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                    node.element.value = String(val)
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
