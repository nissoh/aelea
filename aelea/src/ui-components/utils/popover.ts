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
