import {
  $node,
  component,
  type I$Node,
  type IBehavior,
  type INode,
  type INodeCompose,
  type IStyleCSS,
  nodeEvent,
  style,
  styleBehavior
} from '../../../core/index.js'
import {
  constant,
  empty,
  filter,
  type IStream,
  map,
  merge,
  multicast,
  op,
  switchLatest,
  until,
  zip
} from '../../../stream/index.js'
import { colorAlpha } from '../../../ui-components-theme/color.js'
import { pallete } from '../../../ui-components-theme/globalState.js'
import { $column } from '../../elements/$elements.js'
import { observer } from '../../utils/elementObservers.js'
import { isDesktopScreen } from '../../utils/screenUtils.js'

export const $defaultPopoverContentContainer = $column(
  style({
    backgroundColor: pallete.middleground,
    padding: isDesktopScreen ? '36px' : '16px',
    borderRadius: '24px',
    border: `1px solid ${colorAlpha(pallete.foreground, 0.15)}`,
    boxShadow: `0 0 10px 0 ${colorAlpha(pallete.background, 0.5)}`
  })
)

interface IPocus {
  $open: IStream<I$Node>
  $target: I$Node

  dismiss?: IStream<any>
  spacing?: number
  $contentContainer?: INodeCompose
  $container?: INodeCompose
}

export const $Popover = ({
  $open: open,
  $target,
  $contentContainer = $defaultPopoverContentContainer,
  $container = $node,
  dismiss = empty,
  spacing = 10
}: IPocus) =>
  component(
    (
      [overlayClick, overlayClickTether]: IBehavior<INode, false>,
      [targetIntersection, targetIntersectionTether]: IBehavior<INode, IntersectionObserverEntry[]>,
      [popoverContentDimension, popoverContentDimensionTether]: IBehavior<INode, ResizeObserverEntry[]>
    ) => {
      const openMulticast = multicast(open)

      const contentOps = $contentContainer(
        popoverContentDimensionTether(observer.resize({})),
        styleBehavior(
          zip(
            ([contentRect], [targetRect]) => {
              const screenWidth = targetRect.rootBounds?.width ?? window.innerWidth
              const targetBound = targetRect.intersectionRect
              const bottomSpace = window.innerHeight - targetBound.bottom
              const goDown = bottomSpace > targetBound.bottom

              // clamp width to screen minus both side‑spacings
              const maxWidth = screenWidth - spacing * 2

              const measured = contentRect.target.clientWidth
              const width = Math.min(measured, maxWidth)

              // center on target, then clamp left within [spacing, screenWidth - width - spacing]
              const centerX = targetBound.x + targetBound.width / 2
              const rawLeft = centerX - width / 2
              const maxLeft = screenWidth - width - spacing
              const left = `${Math.max(spacing, Math.min(rawLeft, maxLeft))}px`

              const top = `${goDown ? targetBound.bottom + spacing : targetBound.y - spacing}px`

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
            popoverContentDimension,
            targetIntersection
          )
        ),
        style({ position: 'fixed', visibility: 'hidden' })
      )

      const $overlay = $node(
        style({
          position: 'fixed',
          zIndex: 2321,
          backgroundColor: colorAlpha(pallete.horizon, 0.85),
          top: 0,
          left: 0,
          right: 0,
          bottom: 0 // visibility: 'hidden',
        }),
        overlayClickTether(
          nodeEvent('pointerdown'),
          filter((ev) => {
            if (ev.target instanceof HTMLElement) {
              const computedStyle = getComputedStyle(ev.target)
              if (computedStyle.zIndex === '2321' && computedStyle.inset === '0px') {
                return true
              }
            }

            return false
          }),
          constant(false)
        )
      )

      const dismissEvent = merge(overlayClick, dismiss)

      const $content = switchLatest(
        op(
          openMulticast,
          map((content) => {
            return until(dismissEvent)(merge(style({ zIndex: 3456, left: 0 })(contentOps(content)), $overlay()))
          })
        )
      )

      const targetOp = op(
        $target,
        targetIntersectionTether(
          observer.intersection()
          // map(node => {
          //   const root = node.element instanceof HTMLElement && node.element.offsetParent || null
          //   return observer.intersection({ root })(now(node))
          // }),
          // switchLatest
        ),
        styleBehavior(
          merge(
            constant({ zIndex: 2345, position: 'relative' } as IStyleCSS)(openMulticast), //
            constant(null)(dismissEvent)
          )
        )
      )

      return [
        $container(targetOp, $content),

        {
          overlayClick
        }
      ]
    }
  )
