import { empty, map, mergeArray } from "@most/core"
import { $Node, $element, attr, Behavior, component, event, INode, styleBehavior, IBranch } from '@aelea/core'
import { Control, dismissOp, interactionOp } from './form'
import * as designSheet from '../../common/stylesheet'


export interface Button extends Control {
  $content: $Node,
}

export default (config: Button) => component((
  [interactionBehavior, focusStyle]: Behavior<IBranch, true>,
  [dismissBehavior, dismissstyle]: Behavior<IBranch, false>,
  [sampleClick, click]: Behavior<INode, PointerEvent>
) => {
  return [
    $element('button')(
      designSheet.btn,
      sampleClick(
        event('pointerup')
      ),
      styleBehavior(
        config.disabled ? map(disabled => {
          return disabled ? { opacity: .4, pointerEvents: 'none' } : null
        }, config.disabled) : empty()
      ),
      attr(
        config.disabled ? map(disabled => ({ disabled }), config.disabled) : empty()
      ),

      styleBehavior(
        map(
          active => active ? { borderColor: designSheet.theme.primary } : null,
          mergeArray([focusStyle, dismissstyle])
        )
      ),

      interactionBehavior(interactionOp),
      dismissBehavior(dismissOp),
    )(
      config.$content
    ),

    {
      click
    }
  ]
})
