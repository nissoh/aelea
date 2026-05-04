import { combine, constant, empty, map, merge, o, start } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { multicast } from '../../../stream-extended/index.js'
import { palette } from '../../../ui-components-theme/index.js'
import type { ISlottable } from '../../../ui-renderer-dom/index.js'
import {
  $element,
  component,
  effectProp,
  type INodeCompose,
  nodeEvent,
  styleBehavior
} from '../../../ui-renderer-dom/index.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Input, InputType } from './types.js'

export const $defaultInputContainer = $element('input')(designSheet.input)

export interface IInput extends Input<string | number> {
  type?: InputType
  name?: string
  $container?: INodeCompose<HTMLInputElement>
}

export const $Input = ({ value = empty, validation = constant(null), $container = $defaultInputContainer }: IInput) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable<HTMLInputElement>, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable<HTMLInputElement>, boolean>,
      [blur, blurTether]: IBehavior<ISlottable<HTMLInputElement>, FocusEvent>,
      [change, changeTether]: IBehavior<ISlottable<HTMLInputElement>, string>
    ) => {
      const multicastValidation = o(validation, start(''), multicast)
      const alert = multicastValidation(change)
      const focus = merge(focusStyle, dismissstyle)
      const state = combine({ focus, alert })

      return [
        $container(
          changeTether(
            nodeEvent('input'),
            map(inputEv => (inputEv.target instanceof HTMLInputElement ? inputEv.target.value || '' : ''))
          ),
          styleBehavior(
            map(({ focus, alert }) => {
              if (alert) return { borderBottom: `2px solid ${palette.negative}` }
              return focus ? { borderBottom: `2px solid ${palette.primary}` } : null
            }, state)
          ),
          interactionTether(interactionOp),
          dismissTether(dismissOp),
          blurTether(nodeEvent('blur')),
          effectProp('value', value)
        )(),
        { change, blur }
      ]
    }
  )
