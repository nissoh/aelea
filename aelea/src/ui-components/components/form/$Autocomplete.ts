import { empty, map, merge, op } from '@/stream'
import type { IBehavior } from '@/stream-extended'
import { pallete } from '@/ui-components-theme'
import { $element, attr, component, effectProp, type I$Node, nodeEvent, styleBehavior } from '@/ui-renderer-dom'
import { designSheet } from '../../style/designSheet.js'
import { dismissNodeOp, interactionNodeOp } from './form.js'
import { type Input, InputType } from './types.js'

export interface Autocomplete extends Input<string | number> {
  type?: InputType
  placeholder?: string
  name?: string
}

export const $Autocomplete = ({ type = InputType.TEXT, value = empty, name, placeholder }: Autocomplete) =>
  component(
    (
      [focus, focusTether]: IBehavior<I$Node, boolean>,
      [dismissstyle, dismissTether]: IBehavior<I$Node, boolean>,
      [change, changeTether]: IBehavior<ISlottable<HTMLInputElement>, string>
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

          focusTether(interactionNodeOp),
          dismissTether(dismissNodeOp),
          effectProp('value', value)
        )(),

        {
          change
        }
      ]
    }
  )
