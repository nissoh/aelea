import { empty, map } from "@most/core"
import { $ChildNode, $element, attr, Behavior, component, event, NodeChild, style, stylePseudo } from "fufu"
import { Control } from "../../common/form"
import * as designSheet from '../../common/stylesheet'


export interface Button extends Control {
  $content: $ChildNode,
}

export default (props: Button) => component((
  [sampleClick, click]: Behavior<NodeChild, PointerEvent>
) => [
    $element('button')(
      designSheet.btn,
      sampleClick(
        event('pointerup')
      ),
      style(
        props.disabled ? map(disabled =>
          disabled ? { opacity: .4, pointerEvents: 'none' } : null
          , props.disabled) : empty()
      ),
      attr(
        props.disabled ? map(disabled => ({ disabled }), props.disabled) : empty()
      ),
      stylePseudo(':hover', { border: `2px solid ${designSheet.theme.primary}` }),
      stylePseudo(':focus', { border: `2px solid ${designSheet.theme.primary}` }),
    )(
      props.$content
    ),

    {
      click
    }
  ]
)
