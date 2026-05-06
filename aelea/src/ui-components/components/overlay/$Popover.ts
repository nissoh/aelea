import { constant, empty, type IStream, map, merge, skipRepeats, switchMap } from '../../../stream/index.js'
import { type IBehavior, multicast } from '../../../stream-extended/index.js'
import { colorShade, palette } from '../../../ui-components-theme/index.js'
import {
  $node,
  attr,
  component,
  effectRun,
  type I$Node,
  type INode,
  type INodeCompose,
  nodeEvent,
  style
} from '../../../ui-renderer-dom/index.js'
import { $column } from '../../elements/$elements.js'
import { isDesktopScreen } from '../../utils/screenUtils.js'
import { $Dialog, type IDialogPosition, showPopover } from './$Dialog.js'

const showOverlay = (el: unknown): Disposable | void => {
  const dispose = showPopover(el)
  if (!dispose) return
  const node = el as HTMLElement
  node.style.pointerEvents = 'none'
  const enable = setTimeout(() => {
    node.style.pointerEvents = ''
  }, 100)
  return {
    [Symbol.dispose]() {
      clearTimeout(enable)
      dispose[Symbol.dispose]()
    }
  }
}

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
  component(([overlayClick, overlayClickTether]: IBehavior<INode, false>) => {
    const dismissEvent = merge(overlayClick, dismiss)
    const openContent = multicast(merge($open, constant(null, dismissEvent)))
    const isOpen = multicast(skipRepeats(map(c => c !== null, openContent)))

    const position: IDialogPosition = aEl => {
      const rect = aEl.getBoundingClientRect()
      const bottomSpace = window.innerHeight - rect.bottom
      const goDown = bottomSpace > 200 || bottomSpace > rect.top
      const centerX = rect.left + rect.width / 2
      return {
        top: `${goDown ? rect.bottom + spacing : rect.top - spacing}px`,
        left: `clamp(${spacing}px, ${centerX}px, calc(100vw - ${spacing}px))`,
        transform: `translate(-50%, ${goDown ? '0' : '-100%'})`
      }
    }

    const $backdrop = switchMap(
      open =>
        open
          ? $node(
              attr({ popover: 'manual' }),
              style({
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: `color-mix(in srgb, ${palette.horizon} 85%, transparent)`,
                border: 'none',
                margin: 0,
                padding: 0
              }),
              effectRun(showOverlay),
              overlayClickTether(nodeEvent('click'), constant(false))
            )()
          : empty,
      isOpen
    )

    return [
      $container($Dialog({ $anchor: $target, $content: openContent, position, $contentContainer }), $backdrop),
      { dismiss: dismissEvent }
    ]
  })
