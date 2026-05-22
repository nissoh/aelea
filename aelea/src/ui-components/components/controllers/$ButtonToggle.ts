import { constant, type IOps, type IStream, just, map, never, switchLatest } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { colorShade, palette } from '../../../ui-components-theme/index.js'
import {
  $element,
  $node,
  $text,
  attr,
  attrBehavior,
  component,
  type I$Node,
  type INode,
  type INodeCompose,
  nodeEvent,
  style,
  styleBehavior,
  stylePseudo
} from '../../../ui-renderer-dom/index.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { disabledOp } from './form.js'
import type { Control } from './types.js'

export interface I$ButtonToggle<T> extends Control {
  optionList: T[]
  value: IStream<T>
  $container?: INodeCompose
  $button?: INodeCompose<HTMLButtonElement>
  $$option?: IOps<T, I$Node>
}

export const $defaultButtonToggleBtn = $element('button')(
  attr({ type: 'button' }),
  layoutSheet.row,
  style({
    placeContent: 'center',
    flex: 1,
    borderRadius: '20px',
    padding: '10px 12px',
    alignItems: 'center',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    cursor: 'pointer',
    margin: '-2px',
    textAlign: 'center'
  })
)

export const $defaultButtonToggleContainer = $node(
  attr({ role: 'group' }),
  style({
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: 'minmax(50px, 1fr)',
    borderRadius: '20px',
    border: `1px solid ${colorShade(palette.foreground, 40)}`,
    backgroundColor: palette.middleground
  }),
  stylePseudo(':hover', { borderColor: colorShade(palette.foreground, 40) })
)

export const $ButtonToggle = <T>({
  optionList,
  value,
  disabled = never,
  $$option = map((o: T) => $node($text(String(o)))),
  $button = $defaultButtonToggleBtn,
  $container = $defaultButtonToggleContainer
}: I$ButtonToggle<T>) =>
  component(([select, sampleSelect]: IBehavior<INode<HTMLButtonElement>, T>) => [
    $container(disabledOp(disabled))(
      ...optionList.map(opt =>
        $button(
          sampleSelect(nodeEvent('click'), constant(opt)),
          attrBehavior(map(selectedOpt => ({ 'aria-pressed': selectedOpt === opt ? 'true' : 'false' }), value)),
          styleBehavior(
            map(
              selectedOpt =>
                selectedOpt === opt
                  ? { boxShadow: `0px 0px 0 1px ${palette.primary} inset`, pointerEvents: 'none' }
                  : { color: palette.foreground },
              value
            )
          )
        )(switchLatest($$option(just(opt))))
      )
    ),
    { select }
  ])
