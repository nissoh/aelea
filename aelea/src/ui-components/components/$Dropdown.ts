import {
  constant,
  type IOps,
  type IStream,
  just,
  map,
  merge,
  nowWith,
  reduce,
  skip,
  switchLatest,
  switchMap,
  take,
  toStream
} from '../../stream/index.js'
import type { IBehavior } from '../../stream-extended/index.js'
import { colorShade, palette } from '../../ui-components-theme/index.js'
import {
  $node,
  $text,
  component,
  effectProp,
  fromEventTarget,
  type I$Node,
  type I$Slottable,
  type INode,
  type INodeCompose,
  nodeEvent,
  style,
  stylePseudo
} from '../../ui-renderer-dom/index.js'
import { $column, $row } from '../elements/$elements.js'
import { designSheet } from '../style/designSheet.js'
import { spacing } from '../style/spacing.js'
import { $Dialog, type IDialogPosition } from './overlay/$Dialog.js'

export const $defaultOptionContainer = $row(
  spacing.small,
  style({
    alignItems: 'center',
    cursor: 'pointer',
    padding: '12px 20px',
    width: '100%'
  }),
  stylePseudo(':not(:last-child)', { borderBottom: `1px solid ${palette.horizon}` }),
  stylePseudo(':hover', { backgroundColor: palette.horizon })
)

export const $defaultDropListContainer = $column(
  style({
    whiteSpace: 'pre-wrap',
    maxWidth: '600px',
    userSelect: 'text',
    background: palette.background,
    boxShadow: `${colorShade(palette.message, 14)} 0px 4px 20px 8px, ${colorShade(palette.message, 10)} 0px 1px 3px 1px`,
    borderRadius: '8px',
    fontWeight: 'normal',
    overflow: 'hidden'
  })
)

export const $defaultDropdownContainer = $node(
  style({
    cursor: 'pointer',
    position: 'relative',
    alignItems: 'center',
    display: 'grid',
    gridAutoFlow: 'column'
  })
)

export const $defaultDropdownAnchor = $row(
  spacing.small,
  designSheet.btn,
  style({
    alignItems: 'center',
    padding: '8px 14px',
    cursor: 'pointer'
  })
)($text('Select…'), $node(style({ color: palette.foreground }))($text('▾')))

export interface IDropdown<T> {
  optionList: IStream<readonly T[]> | readonly T[]
  $anchor?: I$Node
  closeOnSelect?: boolean
  $$option?: IOps<T, I$Slottable>
  $container?: INodeCompose
  $dropListContainer?: INodeCompose
  $optionContainer?: INodeCompose
}

const stopPropagation = (ev: MouseEvent) => ev.stopPropagation()

const dropdownPosition: IDialogPosition = aEl => {
  const rect = aEl.getBoundingClientRect()
  const bottomSpace = window.innerHeight - rect.bottom
  const goDown = bottomSpace > rect.bottom
  return {
    top: `${goDown ? rect.bottom + 5 : rect.top - 5}px`,
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`,
    transform: goDown ? 'none' : 'translateY(-100%)'
  }
}

export function $Dropdown<T>({
  $anchor = $defaultDropdownAnchor,
  optionList,
  closeOnSelect = true,
  $container = $defaultDropdownContainer,
  $dropListContainer = $defaultDropListContainer,
  $$option = map((o: T) => $node($text(String(o)))),
  $optionContainer = $defaultOptionContainer
}: IDropdown<T>) {
  return component(
    (
      [select, selectTether]: IBehavior<INode<HTMLElement>, T>,
      [openMenu, openMenuTether]: IBehavior<INode<HTMLElement>, PointerEvent>
    ) => {
      const toggle = constant<'toggle'>('toggle', openMenu)
      const outsideClose = switchLatest(map(() => take(1, skip(1, fromEventTarget(window, 'click'))), openMenu))
      const close = constant<false>(false, closeOnSelect ? merge(outsideClose, select) : outsideClose)
      const isOpen: IStream<boolean> = reduce((open, ev) => (ev === 'toggle' ? !open : ev), false, merge(toggle, close))

      const $dropdownContainer = $container(openMenuTether(nodeEvent('click')))
      const $dropListWithStop = $dropListContainer(
        effectProp(
          'onclick',
          nowWith(() => stopPropagation)
        )
      )

      const $optionListContent = switchMap(
        list =>
          $node(
            ...list.map(opt =>
              $optionContainer(selectTether(nodeEvent('click'), constant(opt)))(switchLatest($$option(just(opt))))
            )
          ),
        toStream(optionList)
      )

      return [
        $Dialog({
          $container: $dropdownContainer,
          $anchor,
          $content: map(open => (open ? $optionListContent : null), isOpen),
          position: dropdownPosition,
          $contentContainer: $dropListWithStop
        }),
        { select, isOpen }
      ]
    }
  )
}
