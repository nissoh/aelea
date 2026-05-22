import {
  combine,
  constant,
  empty,
  type IOps,
  type IStream,
  just,
  map,
  merge,
  never,
  nowWith,
  op,
  reduce,
  skip,
  start,
  switchLatest,
  switchMap,
  take,
  toStream
} from '../../../stream/index.js'
import { animationFrame, type IBehavior } from '../../../stream-extended/index.js'
import { interaction, palette, text } from '../../../ui-components-theme/index.js'
import {
  $element,
  $node,
  $text,
  attr,
  component,
  effectProp,
  effectRun,
  fromEventTarget,
  type I$Node,
  type I$Slottable,
  type INode,
  type INodeCompose,
  nodeEvent,
  style,
  styleInline,
  stylePseudo
} from '../../../ui-renderer-dom/index.js'
import { $column, $row } from '../../elements/$elements.js'
import { layoutSheet } from '../../style/layoutSheet.js'
import { spacing } from '../../style/spacing.js'
import { observer } from '../../utils/elementObservers.js'
import { showPopover } from '../../utils/popover.js'
import { disabledOp } from './form.js'
import type { Control } from './types.js'

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
    boxShadow: `${palette.shadow} 0px 4px 20px 8px, ${palette.shadow} 0px 1px 3px 1px`,
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

export const $defaultDropdownAnchor = $element('button')(
  layoutSheet.row,
  spacing.small,
  attr({ type: 'button' }),
  style({
    fontFamily: 'inherit',
    fontWeight: 300,
    fontSize: text.base,
    color: palette.message,
    backgroundColor: 'transparent',
    border: `2px solid ${palette.message}`,
    outline: 'none',
    cursor: 'pointer',
    alignItems: 'center',
    padding: '8px 14px',
    flexShrink: 0
  }),
  stylePseudo(':hover', { filter: interaction.hoverFilter }),
  stylePseudo(':active', { filter: interaction.activeFilter })
)($text('Select…'), $node(style({ color: palette.foreground }))($text('▾')))

export interface I$Dropdown<T> extends Control {
  optionList: IStream<readonly T[]> | readonly T[]
  $anchor?: I$Node
  closeOnSelect?: boolean
  $$option?: IOps<T, I$Slottable>
  $container?: INodeCompose
  $dropListContainer?: INodeCompose
  $optionContainer?: INodeCompose
}

const stopPropagation = (ev: MouseEvent) => ev.stopPropagation()

export function $Dropdown<T>({
  $anchor = $defaultDropdownAnchor,
  optionList,
  disabled = never,
  closeOnSelect = true,
  $container = $defaultDropdownContainer,
  $dropListContainer = $defaultDropListContainer,
  $$option = map((o: T) => $node($text(String(o)))),
  $optionContainer = $defaultOptionContainer
}: I$Dropdown<T>) {
  return component(
    (
      [select, selectTether]: IBehavior<INode<HTMLElement>, T>,
      [openMenu, openMenuTether]: IBehavior<INode<HTMLElement>, PointerEvent>,
      [anchorEntry, anchorTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>,
      [contentEntry, contentTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>
    ) => {
      const toggle = constant<'toggle'>('toggle', openMenu)
      const outsideClose = switchLatest(map(() => take(1, skip(1, fromEventTarget(window, 'click'))), openMenu))
      const close = constant<false>(false, closeOnSelect ? merge(outsideClose, select) : outsideClose)
      const isOpen: IStream<boolean> = reduce((open, ev) => (ev === 'toggle' ? !open : ev), false, merge(toggle, close))

      const reposition = merge(
        fromEventTarget(window, 'scroll', { capture: true }),
        fromEventTarget(window, 'resize'),
        animationFrame()
      )

      const $observedAnchor = op(
        $anchor,
        anchorTether(observer.intersection() as IOps<INode<HTMLElement>, IntersectionObserverEntry[]>)
      )

      const $list = switchMap(open => {
        if (!open) return empty
        return $dropListContainer(
          attr({ popover: 'manual' }),
          style({
            position: 'fixed',
            visibility: 'hidden',
            border: 'none',
            margin: 0,
            color: 'inherit'
          }),
          effectProp(
            'onclick',
            nowWith(() => stopPropagation)
          ),
          effectRun(showPopover),
          contentTether(observer.intersection() as IOps<INode<HTMLElement>, IntersectionObserverEntry[]>),
          styleInline(
            map(
              ({ aEntry, cEntry }) => {
                const aEl = aEntry[0]?.target as HTMLElement | undefined
                const cEl = cEntry[0]?.target as HTMLElement | undefined
                if (!aEl || !cEl) return {}
                const rect = aEl.getBoundingClientRect()
                const bottomSpace = window.innerHeight - rect.bottom
                const goDown = bottomSpace > rect.bottom
                return {
                  top: `${goDown ? rect.bottom + 5 : rect.top - 5}px`,
                  left: `${rect.left}px`,
                  minWidth: `${rect.width}px`,
                  transform: goDown ? 'none' : 'translateY(-100%)',
                  visibility: 'visible'
                }
              },
              combine({ aEntry: anchorEntry, cEntry: contentEntry, _: start(null, reposition) })
            )
          )
        )(
          switchMap(
            list =>
              $node(
                ...list.map(opt =>
                  $optionContainer(selectTether(nodeEvent('click'), constant(opt)))(switchLatest($$option(just(opt))))
                )
              ),
            toStream(optionList)
          )
        )
      }, isOpen)

      const $dropdownContainer = $container(disabledOp(disabled), openMenuTether(nodeEvent('click')))

      return [$dropdownContainer($observedAnchor, $list), { select, isOpen }]
    }
  )
}
