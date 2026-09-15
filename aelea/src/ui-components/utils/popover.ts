export const showPopover = (el: unknown): Disposable | void => {
  const node = el as HTMLElement
  if (typeof node.showPopover !== 'function') return
  try {
    node.showPopover()
  } catch {
    return
  }
  return {
    [Symbol.dispose]() {
      if (node.matches?.(':popover-open')) {
        try {
          node.hidePopover()
        } catch {}
      }
    }
  }
}

export interface IFloatingRect {
  top: number
  bottom: number
  left: number
  width: number
}

export interface IFloatingPlacement {
  top: number
  left: number
  maxHeight: number
  side: 'below' | 'above'
}

const MIN_USABLE_HEIGHT = 120

/**
 * Place floating content against an anchor inside the viewport.
 *
 * The side is chosen by fit first: below when the content fits there, above
 * when it fits there, otherwise the side with more room. The content is capped
 * to the room on its side, so taller content scrolls instead of running off
 * the viewport, and `top` is clamped so it never leaves it. `gap` separates the
 * content from the anchor and from the viewport edge. When neither side has a
 * usable amount of room the cap never drops below a scrollable minimum, even
 * if the content then overlaps its anchor.
 *
 * `naturalHeight` must be the content's uncapped outer height (scrollHeight
 * plus borders): measuring the rendered height would feed the cap back into
 * the placement.
 */
export function placeFloating(
  anchor: IFloatingRect,
  content: { naturalHeight: number; width: number },
  viewport: { width: number; height: number },
  gap: number
): IFloatingPlacement {
  const roomBelow = viewport.height - anchor.bottom - 2 * gap
  const roomAbove = anchor.top - 2 * gap
  const side: IFloatingPlacement['side'] =
    content.naturalHeight <= roomBelow
      ? 'below'
      : content.naturalHeight <= roomAbove
        ? 'above'
        : roomBelow >= roomAbove
          ? 'below'
          : 'above'
  const room = side === 'below' ? roomBelow : roomAbove
  const viewportRoom = Math.max(0, viewport.height - 2 * gap)
  const maxHeight = Math.min(Math.max(room, Math.min(MIN_USABLE_HEIGHT, viewportRoom)), viewportRoom)
  const shown = Math.min(content.naturalHeight, maxHeight)
  const preferredTop = side === 'below' ? anchor.bottom + gap : anchor.top - gap - shown
  const top = Math.max(gap, Math.min(preferredTop, viewport.height - gap - shown))
  const centerX = anchor.left + anchor.width / 2
  const left = Math.max(gap, Math.min(centerX - content.width / 2, viewport.width - content.width - gap))
  return { top, left, maxHeight, side }
}
