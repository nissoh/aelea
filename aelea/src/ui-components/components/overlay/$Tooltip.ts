import {
  combine,
  constant,
  empty,
  map,
  skip,
  skipRepeats,
  start,
  switchLatest,
  switchMap
} from '../../../stream/index.js'
import type { IBehavior } from '../../../stream-extended/index.js'
import { colorAlpha, pallete } from '../../../ui-components-theme/index.js'
import {
  component,
  fromEventTarget,
  type I$Node,
  type INode,
  type INodeCompose,
  type IStyleCSS,
  nodeEvent,
  style,
  styleInline
} from '../../../ui-renderer-dom/index.js'
import { $column, $row } from '../../elements/$elements.js'
import { observer } from '../../utils/elementObservers.js'

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
    background: pallete.background,
    boxShadow: `${colorAlpha(pallete.message, 0.14)} 0px 4px 20px 8px, ${colorAlpha(pallete.message, 0.1)} 0px 1px 3px 1px`,
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
}: ITooltip) =>
  component(
    (
      [hover, hoverTether]: IBehavior<INode<HTMLElement>, boolean>,
      [targetIntersection, targetIntersectionTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>,
      [contentIntersection, contentIntersectionTether]: IBehavior<INode<HTMLElement>, IntersectionObserverEntry[]>
    ) => {
      const isTouchDevice = 'ontouchstart' in window
      const enterEvent = isTouchDevice ? 'pointerdown' : 'pointerenter'

      return [
        $container(
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
          ),
          targetIntersectionTether(observer.intersection())
        )(
          style({ cursor: 'help' })($anchor),
          switchMap(show => {
            if (!show) return empty

            return $row(
              contentIntersectionTether(observer.intersection()),
              style({
                zIndex: 5160,
                whiteSpace: 'pre-wrap',
                position: 'fixed',
                visibility: 'hidden',
                padding: '8px'
              }),
              styleInline(
                map(
                  ({ contentEntries, targetEntries }): IStyleCSS | null => {
                    const targetEl = targetEntries[0]?.target as HTMLElement | undefined
                    const contentEl = contentEntries[0]?.target as HTMLElement | undefined
                    if (!targetEl || !contentEl) return null

                    const target = targetEl.getBoundingClientRect()
                    const screenWidth = window.innerWidth
                    const contentHeight = contentEl.clientHeight
                    const bottomSpace = window.innerHeight - target.bottom
                    const goDown = bottomSpace >= contentHeight || bottomSpace >= target.top

                    const measured = contentEl.clientWidth
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
                      visibility: 'visible',
                      transform: `translate(0, ${goDown ? '0' : '-100%'})`
                    }
                  },
                  combine({ contentEntries: contentIntersection, targetEntries: targetIntersection })
                )
              )
            )($dropContainer($content))
          }, hover)
        ),

        { hover }
      ]
    }
  )
