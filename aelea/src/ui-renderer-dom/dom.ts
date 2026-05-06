import {
  disposeAll,
  disposeNone,
  disposeWith,
  type IStream,
  type ITask,
  type ITime,
  nullSink,
  op,
  tap
} from '../stream/index.js'
import type { IElementDescriptor } from '../ui/node.js'
import { createDomScheduler } from '../ui/scheduler.js'
import type {
  I$Node,
  I$Scheduler,
  I$Slottable,
  IAttributeProperties,
  INode,
  ISlotChild,
  IStyleCSS,
  ITextNode
} from '../ui/types.js'

export type INodeElementDom = HTMLElement | SVGElement

const SVG_NS = 'http://www.w3.org/2000/svg'

function materializeElement(node: INode): INodeElementDom {
  const desc = node.element as unknown as IElementDescriptor | undefined
  if (desc && typeof desc === 'object' && desc.native) return desc.native as INodeElementDom
  const tag = desc?.tag ?? 'div'
  const el =
    desc?.namespace === 'svg' ? (document.createElementNS(SVG_NS, tag) as SVGElement) : document.createElement(tag)
  if (desc && typeof desc === 'object') desc.native = el
  return el
}

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

function applyAttributes(attrs: IAttributeProperties<unknown> | null | undefined, element: INodeElementDom) {
  if (!attrs) return
  const el = element as Element
  if (!el.setAttribute) return
  for (const k in attrs) {
    const v = (attrs as any)[k]
    if (v == null) el.removeAttribute(k)
    else el.setAttribute(k, typeof v === 'string' ? v : String(v))
  }
}

function applyInlineStyle(style: IStyleCSS, element: INodeElementDom) {
  const el = element as any
  if (!el?.style?.setProperty) return
  for (const k in style) {
    const v = (style as any)[k]
    el.style.setProperty(toKebab(k), v == null ? null : typeof v === 'string' ? v : String(v))
  }
}

function makePaintWriter<V>(scheduler: I$Scheduler, apply: (value: V) => void) {
  let pendingValue: V | undefined
  let hasPending = false
  let scheduled = false
  const task: ITask = {
    active: true,
    run(_time: ITime) {
      scheduled = false
      if (!task.active || !hasPending) return
      const v = pendingValue as V
      hasPending = false
      pendingValue = undefined
      apply(v)
    },
    error() {
      task.active = false
    },
    [Symbol.dispose]() {
      task.active = false
      hasPending = false
      pendingValue = undefined
    }
  }
  const submit = (value: V) => {
    if (!task.active) return
    pendingValue = value
    hasPending = true
    if (!scheduled) {
      scheduled = true
      scheduler.paint(task)
    }
  }
  return { submit, task }
}

function applyStaticStyle(node: INode<INodeElementDom>, element: INodeElementDom) {
  if (node.staticStyles.length === 0) return
  const el = element as any
  const hasClassList = !!el?.classList
  for (let i = 0; i < node.staticStyles.length; i++) {
    const entry = node.staticStyles[i]
    if (hasClassList) {
      const cls = createStyleRule(entry.style, entry.pseudo)
      if (cls !== null) {
        el.classList.add(cls)
        continue
      }
    }
    if (entry.pseudo === null) applyInlineStyle(entry.style, element)
  }
}

function makeReactiveStyleApplier(element: INodeElementDom) {
  const el = element as any
  let prev = new Map<string, string | null>()
  let scratch = new Map<string, string | null>()
  return (styleObj: IStyleCSS | null) => {
    if (!el?.style?.setProperty) return
    scratch.clear()
    const next = styleObj ?? {}
    for (const k in next) {
      const raw = (next as any)[k]
      scratch.set(toKebab(k), raw == null ? null : typeof raw === 'string' ? raw : String(raw))
    }
    for (const k of prev.keys()) {
      if (!scratch.has(k)) el.style.removeProperty(k)
    }
    for (const [k, v] of scratch) {
      if (prev.get(k) === v) continue
      el.style.setProperty(k, v)
    }
    const tmp = prev
    prev = scratch
    scratch = tmp
  }
}

function mountNodeOrText(
  nodeOrText: NonNullable<ISlotChild>,
  env: { scheduler: I$Scheduler; onError: (err: unknown) => void }
): { el: Node; childDisposables: Disposable } {
  if ('kind' in nodeOrText && nodeOrText.kind === 'text') {
    const el = document.createTextNode('')
    const source = (nodeOrText as ITextNode).value
    if (typeof source === 'string') {
      el.nodeValue = source ?? ''
      return { el, childDisposables: disposeNone }
    }
    if (source) {
      const { submit, task } = makePaintWriter<string>(env.scheduler, val => {
        el.nodeValue = val ?? ''
      })
      const subDisp = op(source as IStream<string>, tap(submit)).run(nullSink, env.scheduler)
      return { el, childDisposables: disposeAll([subDisp, task]) }
    }
    return { el, childDisposables: disposeNone }
  }

  const node = nodeOrText as INode<INodeElementDom>
  const element = materializeElement(node)
  applyStaticStyle(node, element)
  applyAttributes(node.attributes, element)

  const propDisp =
    node.propBehavior.length === 0
      ? disposeNone
      : (() => {
          const disposables: Disposable[] = []
          for (const { key, value } of node.propBehavior) {
            if (key === '__run__') {
              const apply = value as unknown as (el: INodeElementDom, scheduler: I$Scheduler) => Disposable | void
              let disp: Disposable | undefined
              const task: ITask = {
                active: true,
                run() {
                  if (!task.active) return
                  const r = apply(element, env.scheduler)
                  if (r) disp = r
                },
                error() {
                  task.active = false
                },
                [Symbol.dispose]() {
                  task.active = false
                  if (disp) disp[Symbol.dispose]()
                }
              }
              env.scheduler.asap(task)
              disposables.push(task)
              continue
            }
            const { submit, task } = makePaintWriter<unknown>(env.scheduler, v => {
              ;(element as any)[key] = v
            })
            const subDisp = op(value, tap(submit)).run(nullSink, env.scheduler)
            disposables.push(subDisp, task)
          }
          return disposeAll(disposables)
        })()

  const styleInlineDisp =
    node.styleInline.length === 0
      ? disposeNone
      : (() => {
          const disposables: Disposable[] = []
          for (const sb of node.styleInline) {
            const apply = makeReactiveStyleApplier(element)
            const { submit, task } = makePaintWriter<IStyleCSS | null>(env.scheduler, apply)
            const subDisp = op(sb, tap(submit)).run(nullSink, env.scheduler)
            disposables.push(subDisp, task)
          }
          return disposeAll(disposables)
        })()

  const styleClass =
    node.styleBehavior.length === 0
      ? disposeNone
      : (() => {
          const disposables: Disposable[] = []
          for (const sb of node.styleBehavior) {
            const apply = makeReactiveStyleApplier(element)
            const { submit, task } = makePaintWriter<IStyleCSS | null>(env.scheduler, apply)
            const subDisp = op(sb, tap(submit)).run(nullSink, env.scheduler)
            disposables.push(subDisp, task)
          }
          return disposeAll(disposables)
        })()

  const attrBeh =
    node.attributesBehavior.length === 0
      ? disposeNone
      : (() => {
          const disposables: Disposable[] = []
          for (const attrs of node.attributesBehavior) {
            const { submit, task } = makePaintWriter<IAttributeProperties<unknown> | null | undefined>(
              env.scheduler,
              attr => {
                applyAttributes(attr, element)
              }
            )
            const subDisp = op(attrs, tap(submit)).run(nullSink, env.scheduler)
            disposables.push(subDisp, task)
          }
          return disposeAll(disposables)
        })()

  const slotSets: Set<SlotEntry>[] = node.$segments.map(() => new Set())
  const segmentDisposables = node.$segments.map((seg, segIdx) => renderSegmentSlot(seg, element, slotSets, segIdx, env))

  const childDisposables = disposeAll([styleInlineDisp, styleClass, attrBeh, propDisp, ...segmentDisposables])

  return { el: element, childDisposables }
}

type SlotEntry = { el: Node; cleanup: Disposable }

function runSlot(
  $slot: I$Slottable,
  parent: Element,
  mounted: Set<SlotEntry>,
  insert: (el: Node) => void,
  env: { scheduler: I$Scheduler; onError: (err: unknown) => void }
): Disposable {
  const unmountAll = () => {
    for (const m of mounted) m.cleanup[Symbol.dispose]()
    mounted.clear()
  }

  const slotDisposable = $slot.run(
    {
      event(_time, nodeOrText) {
        if (nodeOrText === null || nodeOrText === undefined) {
          unmountAll()
          return
        }
        const m = mountNodeOrText(nodeOrText, env)
        const entry: SlotEntry = { el: m.el, cleanup: disposeNone }
        const remove = () => {
          if (!mounted.has(entry)) return
          mounted.delete(entry)
          m.childDisposables[Symbol.dispose]()
          if (entry.el.parentNode === parent) parent.removeChild(entry.el)
        }
        entry.cleanup = disposeWith(remove)
        insert(entry.el)
        mounted.add(entry)

        const slottable = nodeOrText as { disposable?: { set?: (d: Disposable) => void } }
        if (slottable.disposable && typeof slottable.disposable.set === 'function') {
          try {
            slottable.disposable.set(entry.cleanup)
          } catch {}
        }
      },
      error(_t, err) {
        env.onError(err)
      },
      end() {}
    },
    env.scheduler
  ) as unknown as Disposable

  return disposeWith(() => {
    slotDisposable[Symbol.dispose]()
    unmountAll()
  })
}

function renderSegmentSlot(
  $slot: I$Slottable,
  parent: Element,
  slotSets: Set<SlotEntry>[],
  segIdx: number,
  env: { scheduler: I$Scheduler; onError: (err: unknown) => void }
): Disposable {
  const mounted = slotSets[segIdx]
  return runSlot(
    $slot,
    parent,
    mounted,
    el => {
      let insertAt = mounted.size
      for (let i = 0; i < segIdx; i++) insertAt += slotSets[i].size
      parent.insertBefore(el, parent.childNodes[insertAt] ?? null)
    },
    env
  )
}

function renderRootSlot(
  $slot: I$Slottable,
  parent: Element,
  env: { scheduler: I$Scheduler; onError: (err: unknown) => void }
): Disposable {
  const anchor = document.createComment('')
  parent.insertBefore(anchor, null)
  const mounted = new Set<SlotEntry>()
  const inner = runSlot($slot, parent, mounted, el => parent.insertBefore(el, anchor), env)
  return disposeWith(() => {
    inner[Symbol.dispose]()
    if (anchor.parentNode === parent) parent.removeChild(anchor)
  })
}

export interface IRenderConfig {
  rootAttachment: Element
  $rootNode: I$Node
  scheduler?: I$Scheduler
  onError?: (err: unknown) => void
}

export function render(config: IRenderConfig): Disposable {
  const env = {
    scheduler: config.scheduler ?? createDomScheduler(),
    onError: config.onError ?? ((err: unknown) => console.error('[aelea] render error', err))
  }

  const disposable = renderRootSlot(config.$rootNode as any, config.rootAttachment, env)

  return {
    [Symbol.dispose]() {
      disposable?.[Symbol.dispose]?.()
    }
  }
}
