import {
  empty,
  filter,
  map,
  merge,
  multicast,
  never,
  now,
  startWith,
  switchLatest,
  tap,
} from '@most/core'
import { combineState } from '../../../core/combinator/combine.js'
import { O } from '../../../core/common.js'
import type { Behavior, Ops } from '../../../core/types.js'
import {
  $element,
  component,
  nodeEvent,
  style,
  styleBehavior,
} from '../../../dom/index.js'
import type { IBranch, IStyleCSS } from '../../../dom/types.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { designSheet } from '../../style/designSheet.js'
import { dismissOp, interactionOp } from './form.js'
import type { Input, InputType } from './types.js'

export interface Field extends Input<string | number> {
  type?: InputType
  name?: string
  fieldStyle?: IStyleCSS

  inputOp?: Ops<IBranch, IBranch>
}

export const $Field = ({
  value = empty(),
  fieldStyle = {},
  validation = never,
  inputOp = O(),
}: Field) =>
  component(
    (
      [focusStyle, interactionTether]: Behavior<IBranch, true>,
      [dismissstyle, dismissTether]: Behavior<IBranch, false>,
      [blur, blurTether]: Behavior<IBranch, FocusEvent>,
      [change, changeTether]: Behavior<IBranch<HTMLInputElement>, string>,
    ) => {
      const multicastValidation = O(validation, startWith(''), multicast)

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
            }),
          ),

          inputOp,

          styleBehavior(
            map(({ focus, alert }) => {
              if (alert) {
                return { borderBottom: `2px solid ${pallete.negative}` }
              }

              return focus
                ? { borderBottom: `2px solid ${pallete.primary}` }
                : null
            }, state),
          ),

          interactionTether(interactionOp),
          dismissTether(dismissOp),

          blurTether(nodeEvent('blur')),

          O(
            map((node) =>
              merge(
                now(node),
                filter(
                  () => false,
                  tap((val) => {
                    // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
                    node.element.value = String(val)
                  }, value),
                ),
              ),
            ),
            switchLatest,
          ),
        )(),

        {
          change,
          blur,
        },
      ]
    },
  )
