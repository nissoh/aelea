import { empty, map } from "@most/core"
import { $ChildNode, $element, attr, Behavior, component, event, NodeChild, style, stylePseudo } from '@aelea/core'
import { Control } from './form'
import * as designSheet from '../../common/stylesheet'


export interface Button extends Control {
  $content: $ChildNode,
}

export default (config: Button) => component((
  [sampleClick, click]: Behavior<NodeChild, PointerEvent>
) => [
    $element('button')(
      designSheet.btn,
      sampleClick(
        event('pointerup')
      ),
      style(
        config.disabled ? map(disabled =>
          disabled ? { opacity: .4, pointerEvents: 'none' } : null
          , config.disabled) : empty()
      ),
      attr(
        config.disabled ? map(disabled => ({ disabled }), config.disabled) : empty()
      ),
      stylePseudo(':hover', { border: `2px solid ${designSheet.theme.primary}` }),
      stylePseudo(':focus', { border: `2px solid ${designSheet.theme.primary}` }),
    )(
      config.$content
    ),

    {
      click
    }
  ]
)
