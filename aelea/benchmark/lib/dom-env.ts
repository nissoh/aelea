import { Window } from 'happy-dom'
import { createSyncScheduler, type IUiScheduler } from '../../src/ui/index.js'

let installed = false

export function installDom(): void {
  if (installed) return
  installed = true
  const win = new Window({ url: 'http://localhost' })
  // happy-dom@20.9.0's selector/CSS parser references `window.SyntaxError`
  // (and friends), which the Window leaves undefined under bun — crashing
  // querySelector/insertRule even for valid selectors. Provide the host ctors.
  const w = win as unknown as Record<string, unknown>
  for (const k of ['SyntaxError', 'DOMException', 'TypeError', 'Error']) {
    if (w[k] === undefined) w[k] = (globalThis as unknown as Record<string, unknown>)[k]
  }
  const g = globalThis as any
  g.window = win
  g.document = win.document
  g.HTMLElement = win.HTMLElement
  g.SVGElement = win.SVGElement
  g.Element = win.Element
  g.Node = win.Node
  g.Text = win.Text
  g.Comment = win.Comment
  g.CSSStyleSheet = win.CSSStyleSheet
}

export const syncScheduler: IUiScheduler = createSyncScheduler()

export function freshRoot(): HTMLElement {
  const doc = (globalThis as any).document as Document
  const root = doc.createElement('div')
  doc.body.appendChild(root)
  return root
}

export function dropRoot(root: HTMLElement): void {
  if (root.parentNode) root.parentNode.removeChild(root)
}
