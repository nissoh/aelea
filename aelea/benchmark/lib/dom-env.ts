import { Window } from 'happy-dom'
import type { ITask, ITime } from '../../src/stream/index.js'
import type { I$Scheduler } from '../../src/ui/types.js'

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

const perfNow = () => performance.now()

class SyncScheduler implements I$Scheduler {
  private readonly initialTime = perfNow()
  private readonly initialWallClockTime = Date.now()

  asap(task: ITask): Disposable {
    task.run(this.time())
    return task
  }

  delay(task: ITask, delay: ITime): Disposable {
    setTimeout(() => task.run(this.time()), delay)
    return task
  }

  paint(task: ITask): Disposable {
    task.run(this.time())
    return task
  }

  time(): ITime {
    return perfNow() - this.initialTime
  }

  dayTime(): ITime {
    return this.initialWallClockTime + this.time()
  }
}

export const syncScheduler: I$Scheduler = new SyncScheduler()

export function freshRoot(): HTMLElement {
  const doc = (globalThis as any).document as Document
  const root = doc.createElement('div')
  doc.body.appendChild(root)
  return root
}

export function dropRoot(root: HTMLElement): void {
  if (root.parentNode) root.parentNode.removeChild(root)
}
