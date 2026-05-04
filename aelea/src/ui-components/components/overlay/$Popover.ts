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

// Stacking: overlay below the elevated target, content above both. Numbers are
// arbitrary but the strict ordering must hold for hit-testing to work right.
const Z_OVERLAY = 2321
const Z_TARGET_ELEVATED = 2345
const Z_CONTENT = 3456

// Above this many px of space below the target, prefer down; otherwise compare
// to top space and flip if there's more room above.
const PREFER_DOWN_THRESHOLD_PX = 200

export const $defaultPopoverContentContainer = $column(
  style({
    backgroundColor: palette.middleground,
    padding: isDesktopScreen ? '28px' : '16px',
    borderRadius: '24px',
    border: `1px solid ${colorShade(palette.foreground, 15)}`,
    boxShadow: `0 0 10px 0 ${colorShade(palette.background, 50)}`,
    // Caps width so transform-based centering can't overflow the viewport;
    // host can override.
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

      // Capture-phase so scroll on any nested scrollable triggers reposition
      // (scroll doesn't bubble).
      const updateEvents = merge(
        fromEventTarget(window, 'scroll', { capture: true }),
        fromEventTarget(window, 'resize')
      )

      const openContent = multicast(merge($open, constant(null, dismissEvent)))
      // Multicast + skipRepeats so two consumers (target z-index + overlay
      // mount) share one subscription, and a fresh `$open` emission while
      // already-open doesn't re-trigger them.
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

        // Position against the target rect only; never measure the content.
        // Centering uses `transform: translateX(-50%)` so the popover's own
        // width is irrelevant — avoids the "stuck visibility: hidden" race
        // that happens when IntersectionObserver doesn't re-fire after the
        // content grows from 0 to its laid-out width.
        //
        // Static `visibility: hidden` keeps the first paint blank so the user
        // never sees the content at the default `position: fixed` (top-left)
        // location. The first styleInline emission flips it to `visible` at
        // the computed coords — no two-step jump.
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
