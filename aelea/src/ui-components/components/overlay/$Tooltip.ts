import { constant, empty, map, skip, skipRepeats, start, switchLatest } from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { colorShade, palette } from '../../../ui-components-theme/index.js'
import {
  component,
  fromEventTarget,
  type I$Node,
  type INode,
  type INodeCompose,
  nodeEvent,
  style
} from '../../../ui-renderer-dom/index.js'
import { $column, $row } from '../../elements/$elements.js'
import { $Dialog, type IDialogPosition } from './$Dialog.js'

export interface ITooltip {
  $anchor: I$Node
  $content: I$Node
  $container?: INodeCompose
  $dropContainer?: INodeCompose
}

export const $defaultTooltipDropContainer = $column(
  style({
    whiteSpace: 'pre-wrap',
    maxWidth: '600px',
    userSelect: 'text',
    background: palette.background,
    boxShadow: `${colorShade(palette.message, 14)} 0px 4px 20px 8px, ${colorShade(palette.message, 10)} 0px 1px 3px 1px`,
    padding: '16px',
    minWidth: '300px',
    borderRadius: '8px'
  })
)

export const $defaultTooltipContainer = $row(style({ position: 'relative', minWidth: 0 }))

const SCREEN_PADDING = 8

const tooltipPosition: IDialogPosition = (aEl, cEl) => {
  const target = aEl.getBoundingClientRect()
  const screenWidth = window.innerWidth
  const contentHeight = cEl.clientHeight
  const bottomSpace = window.innerHeight - target.bottom
  const goDown = bottomSpace >= contentHeight || bottomSpace >= target.top

  const measured = cEl.clientWidth
  const maxWidth = Math.max(0, screenWidth - SCREEN_PADDING * 2)
  const width = Math.min(measured, maxWidth)

  const centerX = target.x + target.width / 2
  const rawLeft = centerX - width / 2
  const left = `${Math.min(Math.max(rawLeft, SCREEN_PADDING), screenWidth - width - SCREEN_PADDING)}px`
  const top = `${goDown ? target.bottom : target.y}px`

  return {
    top,
    left,
    width: `${width}px`,
    maxWidth: `${maxWidth}px`,
    transition: 'opacity .2s ease-in-out',
    transform: `translate(0, ${goDown ? '0' : '-100%'})`
  }
}

export const $Tooltip = ({
  $anchor,
  $content,
  $container = $defaultTooltipContainer,
  $dropContainer = $defaultTooltipDropContainer
}: ITooltip) =>
  component(([hover, hoverTether]: IBehavior<INode<HTMLElement>, boolean>) => {
    const isTouchDevice = 'ontouchstart' in window
    const enterEvent = isTouchDevice ? 'pointerdown' : 'pointerenter'

    const $tooltipContainer = $container(
      hoverTether(
        nodeEvent(enterEvent),
        map(ev => {
          const target = ev.currentTarget
          if (!(target instanceof HTMLElement)) return empty
          const leave = isTouchDevice
            ? skip(1, fromEventTarget(window, 'pointerdown'))
            : fromEventTarget(target, 'pointerleave')
          return start(true, constant(false, leave))
        }),
        switchLatest,
        skipRepeats
      )
    )

    return [
      $Dialog({
        $container: $tooltipContainer,
        $anchor: style({ cursor: 'help' })($anchor),
        $content: map(open => (open ? $content : null), hover),
        position: tooltipPosition,
        $contentContainer: $dropContainer
      }),
      { hover }
    ]
  })
