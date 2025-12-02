import { empty, map, merge, op } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { $element, attr, component, effectProp, type INode, styleBehavior } from '@/ui'
import { nodeEvent } from '@/ui-renderer-dom'
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
            map((inputEv: Event) => {
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
              map(active => (active ? { borderBottom: `1px solid ${pallete.primary}` } : null))
            )
          ),

          focusTether(interactionOp),
          dismissTether(dismissOp),
          effectProp('value', value)
        )(),

        {
          change
        }
      ]
    }
  )
