import { combine, empty, map, merge, never, op, start } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { palette, text } from '../../../ui-components-theme/index.js'
import type { ISlottable } from '../../../ui-renderer-dom/index.js'
import {
  $element,
  component,
  effectProp,
  type INodeCompose,
  nodeEvent,
  style,
  styleBehavior,
  stylePseudo
} from '../../../ui-renderer-dom/index.js'
import { disabledOp, dismissOp, interactionOp } from './form.js'
import type { Input, InputType } from './types.js'

export const $defaultInputContainer = $element('input')(
  style({
    fontFamily: 'inherit',
    fontWeight: 300,
    fontSize: text.base,
    color: palette.message,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${palette.message}`,
    outline: 'none',
    minWidth: '25px',
    width: '100%',
    flex: 1,
    flexShrink: 0,
    padding: 0,
    marginTop: '2px'
  }),
  stylePseudo('::placeholder', { color: palette.foreground })
)

export interface I$Input extends Input<string | number> {
  type?: InputType
  name?: string
  $container?: INodeCompose<HTMLInputElement>
}

export const $Input = ({
  value = empty,
  disabled = never,
  validation = never,
  $container = $defaultInputContainer
}: I$Input) =>
  component(
    (
      [focusStyle, interactionTether]: IBehavior<ISlottable<HTMLInputElement>, boolean>,
      [dismissstyle, dismissTether]: IBehavior<ISlottable<HTMLInputElement>, boolean>,
      [blur, blurTether]: IBehavior<ISlottable<HTMLInputElement>, FocusEvent>,
      [change, changeTether]: IBehavior<ISlottable<HTMLInputElement>, string>
    ) => {
      const fieldState = combine({
        focus: start(false, merge(focusStyle, dismissstyle)),
        alert: start(null as string | null, validation)
      })

      return [
        $container(
          changeTether(
            nodeEvent('input'),
            map(inputEv => (inputEv.target instanceof HTMLInputElement ? inputEv.target.value || '' : ''))
          ),
          styleBehavior(
            op(
              fieldState,
              map(p => {
                if (p.alert) return { borderBottom: `2px solid ${palette.negative}` }
                return p.focus ? { borderBottom: `2px solid ${palette.primary}` } : null
              })
            )
          ),
          disabledOp(disabled),
          interactionTether(interactionOp),
          dismissTether(dismissOp),
          blurTether(nodeEvent('blur')),
          effectProp('value', value)
        )(),
        { change, blur }
      ]
    }
  )
