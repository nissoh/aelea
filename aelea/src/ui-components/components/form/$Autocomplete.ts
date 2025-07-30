import type { IBehavior } from '../../../core/combinator/behavior.js'
import { $element, attr, component, type INode, nodeEvent, styleBehavior } from '../../../core/index.js'
import { empty, map, merge, op, snapshot } from '../../../stream/index.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import { type Input, InputType } from './types.js'

export interface Autocomplete extends Input<string | number> {
  type?: InputType
  placeholder?: string
  name?: string
}

export const $Autocomplete = ({ type = InputType.TEXT, value = empty, name, placeholder }: Autocomplete) =>
  component(
    (
      [focus, focusTether]: IBehavior<INode, true>,
      [dismissstyle, dismissTether]: IBehavior<INode, false>,
      [change, changeTether]: IBehavior<INode<HTMLInputElement>, string>
    ) => {
      return [
        $element('input')(
          attr({ name, type, placeholder }),
          designSheet.input,

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

          styleBehavior(
            op(
              merge(focus, dismissstyle),
              map((active) => (active ? { borderBottom: `1px solid ${pallete.primary}` } : null))
            )
          ),

          focusTether(interactionOp),
          dismissTether(dismissOp),

          changeTether((inputNode) =>
            snapshot((node, text) => {
              // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
              node.element.value = String(text)
              return text
            }, inputNode)(value)
          )
        )(),

        {
          change
        }
      ]
    }
  )
