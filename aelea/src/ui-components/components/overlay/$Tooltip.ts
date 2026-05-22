import {
  combine,
  constant,
  empty,
  type IOps,
  map,
  merge,
  op,
  skip,
  skipRepeats,
  start,
  switchLatest,
  switchMap
} from '../../../stream/index.js'
import { animationFrame, type IBehavior } from '../../../stream-extended/index.js'
import { palette } from '../../../ui-components-theme/index.js'
import {
  attr,
  component,
  effectRun,
  fromEventTarget,
  type I$Node,
  type INode,
  type INodeCompose,
  nodeEvent,
  style,
  styleInline
} from '../../../ui-renderer-dom/index.js'
import { $column, $row } from '../../elements/$elements.js'
import { observer } from '../../utils/elementObservers.js'
import { showPopover } from '../../utils/popover.js'

export interface I$Tooltip {
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
    boxShadow: `${palette.shadow} 0px 4px 20px 8px, ${palette.shadow} 0px 1px 3px 1px`,
    padding: '16px',
    minWidth: '300px',
    borderRadius: '8px'
  })
)

export const $defaultTooltipContainer = $row(style({ position: 'relative', minWidth: 0 }))

const SCREEN_PADDING = 8

export const $Tooltip = ({
  $anchor,
  $content,
  $container = $defaultTooltipContainer,
  $dropContainer = $defaultTooltipDropContainer
}: I$Tooltip) =>
  component(
    (
      [hover, hoverTether]: IBehavior<INode<HTMLElement>, boolean>,
      [anchorEntry, anchorTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>,
      [contentEntry, contentTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>
    ) => {
      const isTouchDevice = 'ontouchstart' in window
      const enterEvent = isTouchDevice ? 'pointerdown' : 'pointerenter'

      const reposition = merge(
        fromEventTarget(window, 'scroll', { capture: true }),
        fromEventTarget(window, 'resize'),
        animationFrame()
      )

      const $observedAnchor = op(
        style({ cursor: 'help' })($anchor),
        anchorTether(observer.intersection() as IOps<INode<HTMLElement>, IntersectionObserverEntry[]>)
      )

      const $tip = switchMap(show => {
        if (!show) return empty
        return $dropContainer(
          attr({ popover: 'manual' }),
          style({
            position: 'fixed',
            visibility: 'hidden',
            border: 'none',
            margin: 0,
            color: 'inherit',
            overflow: 'visible'
          }),
          effectRun(showPopover),
          contentTether(observer.intersection() as IOps<INode<HTMLElement>, IntersectionObserverEntry[]>),
          styleInline(
            map(
              ({ aEntry, cEntry }) => {
                const aEl = aEntry[0]?.target as HTMLElement | undefined
                const cEl = cEntry[0]?.target as HTMLElement | undefined
                if (!aEl || !cEl) return {}
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
                  transform: `translate(0, ${goDown ? '0' : '-100%'})`,
                  visibility: 'visible'
                }
              },
              combine({ aEntry: anchorEntry, cEntry: contentEntry, _: start(null, reposition) })
            )
          )
        )($content)
      }, hover)

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

      return [$tooltipContainer($observedAnchor, $tip), { hover }]
    }
  )
