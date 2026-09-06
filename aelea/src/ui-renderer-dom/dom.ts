import type { ITask, ITime } from '../stream/index.js'
import {
  applyOwnedKeys,
  type IBindingSink,
  type IMountBackend,
  type IOwnedKeysWriter,
  MountContext,
  mountRoot
} from '../ui/backend.js'
import { createDomScheduler } from '../ui/scheduler.js'
import type { I$Node, I$Scheduler, IAttributes, IEffect, IRecipe, IStaticStyleEntry, IStyleCSS } from '../ui/types.js'

export type INodeElementDom = HTMLElement | SVGElement

const SVG_NS = 'http://www.w3.org/2000/svg'

const STYLE_TAG_ID = '__aelea_style__'
let ruleCounter = 0
let styleSheet: CSSStyleSheet | null = null

function ensureStyleSheet(): CSSStyleSheet | null {
  if (styleSheet) return styleSheet
  if (typeof document === 'undefined') return null
  if (typeof document.getElementById !== 'function' || typeof document.createElement !== 'function') return null
  let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  if (!tag) {
    tag = document.createElement('style')
    tag.id = STYLE_TAG_ID
    document.head?.appendChild(tag)
  }
  styleSheet = tag.sheet as CSSStyleSheet | null
  return styleSheet
}

const kebabCache = new Map<string, string>()
const toKebab = (prop: string): string => {
  const hit = kebabCache.get(prop)
  if (hit !== undefined) return hit
  const out = prop.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
  kebabCache.set(prop, out)
  return out
}

function styleToCss(style: IStyleCSS): string {
  let out = ''
  for (const k in style) {
    const v = (style as any)[k]
    if (v == null) continue
    out += `${toKebab(k)}:${typeof v === 'string' ? v : String(v)};`
  }
  return out
}

function styleCacheKey(style: IStyleCSS, pseudo: string | null): string {
  const keys = Object.keys(style).sort()
  let body = ''
  for (const k of keys) {
    const v = (style as Record<string, unknown>)[k]
    if (v === null || v === undefined) continue
    body += `${toKebab(k)}:${String(v)};`
  }
  return pseudo === null ? body : `${pseudo}|${body}`
}

const ruleCache = new Map<string, string>()
const ruleObjectCache = new WeakMap<object, Map<string | null, string>>()

/**
 * One cached class per distinct static declaration set, minted into a shared
 * stylesheet. Returns `null` where no stylesheet can exist, so callers fall
 * back to inline writes.
 */
export function createStyleRule(style: IStyleCSS, pseudo: string | null = null): string | null {
  let perPseudo = ruleObjectCache.get(style)
  const ident = perPseudo?.get(pseudo)
  if (ident !== undefined) return ident
  const key = styleCacheKey(style, pseudo)
  const hit = ruleCache.get(key)
  if (hit !== undefined) {
    if (perPseudo === undefined) {
      perPseudo = new Map()
      ruleObjectCache.set(style, perPseudo)
    }
    perPseudo.set(pseudo, hit)
    return hit
  }
  const sheet = ensureStyleSheet()
  if (sheet === null) return null
  const className = `ae-${++ruleCounter}`
  const selector = pseudo === null ? `.${className}` : `.${className}${pseudo}`
  sheet.insertRule(`${selector}{${styleToCss(style)}}`, sheet.cssRules.length)
  ruleCache.set(key, className)
  if (perPseudo === undefined) {
    perPseudo = new Map()
    ruleObjectCache.set(style, perPseudo)
  }
  perPseudo.set(pseudo, className)
  return className
}

function applyAttributes(attrs: IAttributes, element: INodeElementDom): void {
  const el = element as Element
  if (!el.setAttribute) return
  for (const k in attrs) {
    const v = attrs[k]
    if (v == null) el.removeAttribute(k)
    else el.setAttribute(k, typeof v === 'string' ? v : String(v))
  }
}

function applyInlineStyle(style: IStyleCSS, element: INodeElementDom): void {
  const el = element as any
  if (!el?.style?.setProperty) return
  for (const k in style) {
    const v = (style as any)[k]
    el.style.setProperty(toKebab(k), v == null ? null : typeof v === 'string' ? v : String(v))
  }
}

function applyStaticStyle(staticStyles: readonly IStaticStyleEntry[], element: INodeElementDom): void {
  if (staticStyles.length === 0) return
  const el = element as any
  const hasClassList = !!el?.classList
  for (let i = 0; i < staticStyles.length; i++) {
    const entry = staticStyles[i]
    if (hasClassList) {
      let cls = entry.className
      if (cls === undefined) {
        const resolved = createStyleRule(entry.style, entry.pseudo)
        if (resolved !== null) entry.className = cls = resolved
      }
      if (cls !== undefined) {
        el.classList.add(cls)
        continue
      }
    }
    if (entry.pseudo === null) applyInlineStyle(entry.style, element)
  }
}

type IBindingChannel = 'style' | 'attr' | 'prop' | 'text'

export interface ICommitRecord {
  seq: number
  time: ITime
  channel: IBindingChannel
  value: string
}

export interface IRenderDevtool {
  journal(limit?: number): readonly ICommitRecord[]
  bindings(): { total: number; live: number; byChannel: Record<string, number> }
}

const JOURNAL_CAPACITY = 500

/**
 * The single commit point per render tree: bindings enqueue onto a dirty
 * list and ONE paint task flushes the whole frame's writes. Each apply is
 * guarded individually so one bad write cannot starve the rest of the frame.
 */
class Committer implements ITask {
  active = true
  private dirtyList: BindingEffect<unknown>[] = []
  private scheduled = false

  journal: ICommitRecord[] | null = null
  registry: Set<BindingEffect<unknown>> | null = null
  totalBindings = 0
  private seq = 0

  constructor(
    readonly scheduler: I$Scheduler,
    readonly onError: (err: unknown) => void
  ) {}

  enqueue(effect: BindingEffect<unknown>): void {
    if (effect.dirty) return
    effect.dirty = true
    this.dirtyList.push(effect)
    if (!this.scheduled) {
      this.scheduled = true
      this.scheduler.paint(this)
    }
  }

  run(time: ITime): void {
    this.scheduled = false
    const batch = this.dirtyList
    this.dirtyList = []
    for (let i = 0; i < batch.length; i++) {
      const effect = batch[i]
      effect.dirty = false
      try {
        effect.flush(time)
      } catch (err) {
        queueMicrotask(() => {
          throw err
        })
      }
    }
  }

  error(_time: ITime, err: unknown): void {
    this.onError(err)
  }

  record(time: ITime, channel: IBindingChannel, value: unknown): void {
    const journal = this.journal
    if (journal === null) return
    if (journal.length >= JOURNAL_CAPACITY) journal.splice(0, journal.length - JOURNAL_CAPACITY + 1)
    journal.push({ seq: ++this.seq, time, channel, value: summarize(value) })
  }

  [Symbol.dispose](): void {
    this.active = false
    this.dirtyList = []
  }
}

function summarize(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 77)}...` : value
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value)
      return s.length > 80 ? `${s.slice(0, 77)}...` : s
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

/**
 * One object per reactive binding: the stream sink, the paint-coalescing
 * mailbox (last emission in a frame wins) and the applier. Style and
 * attribute channels own the keys of their latest emission.
 */
class BindingEffect<V> implements IBindingSink<V> {
  active = true
  dirty = false
  private pending: V | undefined
  private hasPending = false
  private prev: object | null = null

  constructor(
    readonly channel: IBindingChannel,
    readonly el: any,
    readonly backend: DomBackend,
    readonly key: string | null = null
  ) {
    const committer = backend.committer
    if (committer.registry !== null) {
      committer.totalBindings++
      committer.registry.add(this as BindingEffect<unknown>)
    }
  }

  event(_time: ITime, value: V): void {
    if (!this.active) return
    this.pending = value
    this.hasPending = true
    this.backend.committer.enqueue(this as BindingEffect<unknown>)
  }

  flush(time: ITime): void {
    if (!this.active || !this.hasPending) return
    const value = this.pending as V
    this.pending = undefined
    this.hasPending = false
    try {
      this.apply(value)
      this.backend.committer.record(time, this.channel, value)
    } catch (err) {
      this.backend.onError(err)
    }
  }

  error(_time: ITime, err: unknown): void {
    this.backend.onError(err)
  }

  end(): void {}

  [Symbol.dispose](): void {
    this.active = false
    this.pending = undefined
    this.hasPending = false
    this.backend.committer.registry?.delete(this as BindingEffect<unknown>)
  }

  private apply(value: V): void {
    switch (this.channel) {
      case 'text':
        this.el.nodeValue = (value as unknown as string) ?? ''
        return
      case 'prop':
        this.el[this.key as string] = value
        return
      case 'attr':
        if ((value as unknown) === this.prev) return
        applyOwnedKeys(this.prev, value as IAttributes | null, attributeWriter, this.el)
        this.prev = value as IAttributes | null
        return
      default:
        if ((value as unknown) === this.prev) return
        if (!this.el?.style?.setProperty) return
        applyOwnedKeys(this.prev, value as IStyleCSS | null, styleWriter, this.el)
        this.prev = value as IStyleCSS | null
    }
  }
}

const attributeWriter: IOwnedKeysWriter<Element> = {
  set(el, key, value) {
    el.setAttribute(key, value)
  },
  remove(el, key) {
    el.removeAttribute(key)
  }
}

const styleWriter: IOwnedKeysWriter<HTMLElement> = {
  set(el, key, value) {
    el.style.setProperty(toKebab(key), value)
  },
  remove(el, key) {
    el.style.removeProperty(toKebab(key))
  }
}

class EffectTask implements ITask, Disposable {
  active = true
  private cleanup: Disposable | undefined

  constructor(
    readonly el: INodeElementDom,
    readonly apply: IEffect<INodeElementDom>,
    readonly backend: DomBackend
  ) {}

  run(): void {
    if (!this.active) return
    const result = this.apply(this.el, this.backend.scheduler)
    if (result) this.cleanup = result
  }

  error(_time: ITime, err: unknown): void {
    this.active = false
    this.backend.onError(err)
  }

  [Symbol.dispose](): void {
    this.active = false
    this.cleanup?.[Symbol.dispose]()
  }
}

/**
 * The browser backend of the shared mount walk. Teardown of an attached
 * subtree disposes the subtree first (bindings and effect cleanups still see
 * an attached element) and detaches the root once; descendants skip their
 * own removal via the containment check.
 */
class DomBackend implements IMountBackend<INodeElementDom, Text> {
  private discardingRoot: Node | null = null

  constructor(
    readonly scheduler: I$Scheduler,
    readonly onError: (err: unknown) => void,
    readonly committer: Committer
  ) {}

  element(recipe: IRecipe<INodeElementDom>): INodeElementDom {
    const descriptor = recipe.element
    if (descriptor.native) return descriptor.native as INodeElementDom
    return descriptor.namespace === 'svg'
      ? (document.createElementNS(SVG_NS, descriptor.tag) as SVGElement)
      : document.createElement(descriptor.tag)
  }

  text(value: string): Text {
    return document.createTextNode(value)
  }

  textSink(text: Text): IBindingSink<string> {
    return new BindingEffect<string>('text', text, this)
  }

  staticStyle(element: INodeElementDom, entries: readonly IStaticStyleEntry[]): void {
    applyStaticStyle(entries, element)
  }

  staticAttributes(element: INodeElementDom, attributes: IAttributes): void {
    applyAttributes(attributes, element)
  }

  styleSink(element: INodeElementDom): IBindingSink<IStyleCSS | null> {
    return new BindingEffect<IStyleCSS | null>('style', element, this)
  }

  attributeSink(element: INodeElementDom): IBindingSink<IAttributes | null> {
    return new BindingEffect<IAttributes | null>('attr', element, this)
  }

  propSink(element: INodeElementDom, key: string): IBindingSink<unknown> {
    return new BindingEffect<unknown>('prop', element, this, key)
  }

  effect(element: INodeElementDom, apply: IEffect<INodeElementDom>): Disposable {
    const task = new EffectTask(element, apply, this)
    this.scheduler.asap(task)
    return task
  }

  insert(parent: INodeElementDom, child: Node, before: Node | null): void {
    if (before === null) parent.appendChild(child)
    else parent.insertBefore(child, before)
  }

  unmount(parent: INodeElementDom, child: Node, subtree: Disposable): void {
    const root = this.discardingRoot
    if (root?.contains(child)) {
      subtree[Symbol.dispose]()
      return
    }
    if (root === null && child.parentNode === parent) {
      this.discardingRoot = child
      try {
        subtree[Symbol.dispose]()
      } finally {
        this.discardingRoot = null
      }
      if (child.parentNode === parent) parent.removeChild(child)
      return
    }
    subtree[Symbol.dispose]()
    if (child.parentNode === parent) parent.removeChild(child)
  }
}

export interface IRenderConfig {
  rootAttachment: Element
  $rootNode: I$Node
  scheduler?: I$Scheduler
  onError?: (err: unknown) => void
  devtool?: boolean
}

export interface IRenderResult extends Disposable {
  devtool?: IRenderDevtool
}

export function render(config: IRenderConfig): IRenderResult {
  const scheduler = config.scheduler ?? createDomScheduler()
  const onError = config.onError ?? ((err: unknown) => console.error('[aelea] render error', err))
  const committer = new Committer(scheduler, onError)
  const backend = new DomBackend(scheduler, onError, committer)

  if (config.devtool) {
    committer.journal = []
    committer.registry = new Set()
  }

  const parent = config.rootAttachment as INodeElementDom
  const anchor = document.createComment('')
  parent.insertBefore(anchor, null)
  const mounted = mountRoot(
    new MountContext(backend),
    config.$rootNode as I$Node<INodeElementDom>,
    parent,
    anchor as unknown as Text
  )

  const result: IRenderResult = {
    [Symbol.dispose]() {
      committer[Symbol.dispose]()
      mounted[Symbol.dispose]()
      if (anchor.parentNode === parent) parent.removeChild(anchor)
    }
  }

  if (config.devtool) {
    result.devtool = {
      journal(limit) {
        const j = committer.journal ?? []
        return limit === undefined ? j.slice() : j.slice(-limit)
      },
      bindings() {
        const byChannel: Record<string, number> = {}
        let live = 0
        for (const b of committer.registry ?? []) {
          if (b.active) live++
          byChannel[b.channel] = (byChannel[b.channel] ?? 0) + 1
        }
        return { total: committer.totalBindings, live, byChannel }
      }
    }
  }

  return result
}
