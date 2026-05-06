import { Window } from 'happy-dom'
import type { ITask, ITime } from '../../src/stream/index.js'
import type { I$Scheduler } from '../../src/ui/types.js'

let installed = false

export function installDom(): void {
  if (installed) return
  installed = true
  const win = new Window({ url: 'http://localhost' })
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
