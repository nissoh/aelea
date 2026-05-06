import {
  combine,
  constant,
  empty,
  type IOps,
  type IStream,
  map,
  merge,
  op,
  skipRepeats,
  start,
  switchMap
} from '../../../stream/index.js'
import { type IBehavior, multicast } from '../../../stream-extended/index.js'
import { colorShade, palette } from '../../../ui-components-theme/index.js'
import {
  $node,
  component,
  fromEventTarget,
  type I$Node,
  type INode,
  type INodeCompose,
  nodeEvent,
  style,
  styleBehavior,
  styleInline
} from '../../../ui-renderer-dom/index.js'
import { $column } from '../../elements/$elements.js'
import { observer } from '../../utils/elementObservers.js'
import { isDesktopScreen } from '../../utils/screenUtils.js'

// Strict ordering required for hit-testing: overlay < elevated target < content.
const Z_OVERLAY = 2321
const Z_TARGET_ELEVATED = 2345
const Z_CONTENT = 3456

const PREFER_DOWN_THRESHOLD_PX = 200

export const $defaultPopoverContentContainer = $column(
  style({
    backgroundColor: palette.middleground,
    padding: isDesktopScreen ? '28px' : '16px',
    borderRadius: '24px',
    border: `1px solid ${colorShade(palette.foreground, 15)}`,
    boxShadow: `0 0 10px 0 ${colorShade(palette.background, 50)}`,
    maxWidth: 'calc(100vw - 20px)'
  })
)

interface IPopover {
  $open: IStream<I$Node>
  $target: I$Node
  dismiss?: IStream<unknown>
  spacing?: number
  $contentContainer?: INodeCompose
  $container?: INodeCompose
}

export const $Popover = ({
  $open,
  $target,
  $contentContainer = $defaultPopoverContentContainer,
  $container = $node,
  dismiss = empty,
  spacing = 10
}: IPopover) =>
  component(
    (
      [overlayClick, overlayClickTether]: IBehavior<INode, false>,
      [targetIntersection, targetIntersectionTether]: IBehavior<INode, IntersectionObserverEntry[]>
    ) => {
      const dismissEvent = merge(overlayClick, dismiss)

      // Capture-phase so scroll on nested scrollables triggers reposition.
      const updateEvents = merge(
        fromEventTarget(window, 'scroll', { capture: true }),
        fromEventTarget(window, 'resize')
      )

      const openContent = multicast(merge($open, constant(null, dismissEvent)))
      const isOpen = multicast(skipRepeats(map(content => content !== null, openContent)))

      const $targetWithZIndex = op(
        $target,
        targetIntersectionTether(observer.intersection() as IOps<INode<unknown>, IntersectionObserverEntry[]>),
        styleBehavior(
          map(open => (open ? ({ zIndex: Z_TARGET_ELEVATED, position: 'relative' } as const) : null), isOpen)
        )
      )

      const $overlay = switchMap(
        open =>
          open
            ? $node(
                style({
                  position: 'fixed',
                  zIndex: Z_OVERLAY,
                  backgroundColor: `color-mix(in srgb, ${palette.horizon} 85%, transparent)`,
                  inset: 0
                }),
                overlayClickTether(nodeEvent('pointerdown'), constant(false))
              )()
            : empty,
        isOpen
      )

      const $content = switchMap($body => {
        if (!$body) return empty

        // Centering via `transform: translateX(-50%)` lets us position from
        // the target rect alone — no content-width measurement. Static
        // `visibility: hidden` keeps the first paint at fixed (0,0)
        // invisible until styleInline computes the real coords.
        return $contentContainer(
          style({ position: 'fixed', zIndex: Z_CONTENT, visibility: 'hidden' }),
          styleInline(
            map(
              params => {
                const el = params.targetIntersection[0]?.target
                if (!el) return {}

                const rect = el.getBoundingClientRect()
                const bottomSpace = window.innerHeight - rect.bottom
                const topSpace = rect.top
                const goDown = bottomSpace > PREFER_DOWN_THRESHOLD_PX || bottomSpace > topSpace
                const centerX = rect.left + rect.width / 2

                return {
                  top: `${goDown ? rect.bottom + spacing : rect.top - spacing}px`,
                  left: `clamp(${spacing}px, ${centerX}px, calc(100vw - ${spacing}px))`,
                  transform: `translate(-50%, ${goDown ? '0' : '-100%'})`,
                  visibility: 'visible'
                }
              },
              combine({
                targetIntersection,
                updateEvent: start(null, updateEvents)
              })
            )
          )
        )($body)
      }, openContent)

      return [
        $container($targetWithZIndex, $content, $overlay), //
        { dismiss: dismissEvent }
      ]
    }
  )
