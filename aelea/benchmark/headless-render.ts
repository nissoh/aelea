import { createDefaultScheduler } from '../src/stream/index.js'
import type { I$Scheduler } from '../src/ui/index.js'
import { $element, $text, render, style } from '../src/ui/index.js'

/**
 * Headless smoke test with a tiny in-memory DOM.
 * Run with: bun run benchmark/headless-render.ts
 */

class HeadlessClassList {
  private classes = new Set<string>()
  add(...cls: string[]): void {
    for (const c of cls) this.classes.add(c)
  }
  remove(...cls: string[]): void {
    for (const c of cls) this.classes.delete(c)
  }
  replace(oldToken: string, newToken: string): void {
    if (this.classes.has(oldToken)) {
      this.classes.delete(oldToken)
    }
    this.classes.add(newToken)
  }
  toString(): string {
    return Array.from(this.classes).join(' ')
  }
}

class HeadlessStyleDeclaration {
  private map = new Map<string, string>()
  setProperty(name: string, value: string | null): void {
    if (value === null) {
      this.map.delete(name)
      return
    }
    this.map.set(name, value)
  }
  toString(): string {
    return Array.from(this.map.entries())
      .map(([k, v]) => `${k}:${v}`)
      .join(';')
  }
}

class HeadlessNode extends EventTarget {
  parentNode: HeadlessElement | null = null
  childNodes: HeadlessNode[] = []
  constructor(
    readonly nodeType: number,
    readonly nodeName: string
  ) {
    super()
  }
  get children(): HeadlessElement[] {
    return this.childNodes.filter((c): c is HeadlessElement => c.nodeType === 1)
  }
  remove(): void {
    if (!this.parentNode) return
    const idx = this.parentNode.childNodes.indexOf(this)
    if (idx !== -1) {
      this.parentNode.childNodes.splice(idx, 1)
    }
    this.parentNode = null
  }
  insertBefore<T extends HeadlessNode>(newNode: T, referenceNode?: HeadlessNode | null): T {
    newNode.remove()
    newNode.parentNode = this as unknown as HeadlessElement
    if (!referenceNode) {
      this.childNodes.push(newNode)
      return newNode
    }
    const idx = this.childNodes.indexOf(referenceNode)
    if (idx === -1) {
      this.childNodes.push(newNode)
    } else {
      this.childNodes.splice(idx, 0, newNode)
    }
    return newNode
  }
  prepend<T extends HeadlessNode>(newNode: T): void {
    this.insertBefore(newNode, this.childNodes[0] ?? null)
  }
}

class HeadlessElement extends HeadlessNode {
  classList = new HeadlessClassList()
  style = new HeadlessStyleDeclaration()
  attributes = new Map<string, string>()
  constructor(readonly tagName: string) {
    super(1, tagName.toUpperCase())
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }
  get children(): HeadlessElement[] {
    return super.children
  }
  toString(): string {
    const attrs: [string, string][] = Array.from(this.attributes.entries())
    const className = this.classList.toString()
    if (className) attrs.push(['class', className])
    const attrString = attrs.map(([k, v]) => `${k}="${v}"`).join(' ')
    const children = this.childNodes.map(child => child.toString()).join('')
    const space = attrString.length > 0 ? ' ' : ''
    return `<${this.tagName}${space}${attrString}>${children}</${this.tagName}>`
  }
}

class HeadlessText extends HeadlessNode {
  constructor(public nodeValue: string) {
    super(3, '#text')
  }
  toString(): string {
    return this.nodeValue
  }
}

class HeadlessCSSStyleSheet {
  cssRules: { cssText: string }[] = []
  insertRule(rule: string, index?: number): number {
    const insertAt = index ?? this.cssRules.length
    this.cssRules.splice(insertAt, 0, { cssText: rule })
    return insertAt
  }
}

class HeadlessDocument {
  private _adoptedStyleSheets: HeadlessCSSStyleSheet[] = []
  createElement(tag: string): HeadlessElement {
    return new HeadlessElement(tag)
  }
  createElementNS(_ns: string, tag: string): HeadlessElement {
    return new HeadlessElement(tag)
  }
  createTextNode(text: string): HeadlessText {
    return new HeadlessText(text)
  }
  get adoptedStyleSheets(): HeadlessCSSStyleSheet[] {
    return this._adoptedStyleSheets
  }
  set adoptedStyleSheets(sheets: HeadlessCSSStyleSheet[]) {
    this._adoptedStyleSheets = sheets
  }
}

// Install globals for UI code
const document = new HeadlessDocument()
// @ts-expect-error: install global document
globalThis.document = document
// @ts-expect-error: install CSSStyleSheet
globalThis.CSSStyleSheet = HeadlessCSSStyleSheet
// Minimal performance/requestAnimationFrame for schedulers
// @ts-expect-error: install performance
globalThis.performance = globalThis.performance ?? ({ now: () => Date.now() } as Performance)
// @ts-expect-error: install requestAnimationFrame
globalThis.requestAnimationFrame =
  globalThis.requestAnimationFrame ?? ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16))
// @ts-expect-error: install cancelAnimationFrame
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame ?? ((id: number) => clearTimeout(id))

const baseScheduler = createDefaultScheduler()
const scheduler: I$Scheduler = {
  asap: task => baseScheduler.asap(task),
  delay: (task, delay) => baseScheduler.delay(task, delay),
  paint: task => baseScheduler.asap(task),
  time: () => baseScheduler.time(),
  dayTime: () => baseScheduler.dayTime()
}

const root = document.createElement('section')

const containerStyle = style({
  display: 'flex',
  gap: '8px',
  padding: '12px',
  color: 'tomato'
})

const $App = $element('div')(containerStyle)(
  $element('span')($text('Hello')),
  $element('span')($text('headless renderer'))
)

render({
  rootAttachment: root as unknown as HTMLElement,
  $rootNode: $App,
  scheduler
})

const flush = () =>
  new Promise(resolve => (typeof setImmediate === 'function' ? setImmediate(resolve) : setTimeout(resolve, 0)))
await flush()
await flush()
await flush()
await flush()

const css = document.adoptedStyleSheets.map(sheet => sheet.cssRules.map(rule => rule.cssText).join('\n')).join('\n')

console.log('HTML:')
console.log(root.toString())
console.log('\nCSS:')
console.log(css)
