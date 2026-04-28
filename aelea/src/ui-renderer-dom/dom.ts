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

/**
 * Materialize an `INode`'s element descriptor into a real DOM element.
 * Reuses the descriptor's `native` field if present — which is how
 * `$wrapNativeElement` carries a pre-existing element through, and how
 * a second subscription to the same compose (e.g. a `nodeEvent` tether)
 * sees the first one's materialized result. Otherwise calls
 * `createElement` / `createElementNS` and writes the result back to
 * `.native` so downstream DOM helpers can find it.
 */
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
  // Some headless / shim environments expose a partial `document`. Feature-
  // detect instead of assuming — fall through to inline styles on miss.
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

const toKebab = (prop: string) => prop.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
const styleToCss = (style: IStyleCSS) =>
  Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${toKebab(k)}:${String(v)};`)
    .join('')

// Canonical key so distinct style objects with the same content share one rule.
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

/**
 * Mint (or reuse from cache) a class-backed style rule. Returns `null`
 * when no stylesheet is available in the current environment — callers
 * should fall back to inline styles in that case.
 */
export function createStyleRule(style: IStyleCSS): string | null {
  const key = styleCacheKey(style, null)
  const hit = ruleCache.get(key)
  if (hit !== undefined) return hit
  const sheet = ensureStyleSheet()
  if (sheet === null) return null
  const className = `ae-${++ruleCounter}`
  sheet.insertRule(`.${className}{${styleToCss(style)}}`, sheet.cssRules.length)
  ruleCache.set(key, className)
  return className
}

export function createStylePseudoRule(pseudo: string, style: IStyleCSS): string | null {
  const key = styleCacheKey(style, pseudo)
  const hit = ruleCache.get(key)
  if (hit !== undefined) return hit
  const sheet = ensureStyleSheet()
  if (sheet === null) return null
  const className = `ae-${++ruleCounter}`
  sheet.insertRule(`.${className}${pseudo}{${styleToCss(style)}}`, sheet.cssRules.length)
  ruleCache.set(key, className)
  return className
}

function applyAttributes(attrs: IAttributeProperties<unknown> | null | undefined, element: INodeElementDom) {
  if (!attrs) return
  const el = element as Element
  if (!el.setAttribute) return
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) {
      el.removeAttribute(k)
    } else {
      el.setAttribute(k, String(v))
    }
  }
}

function applyInlineStyle(style: IStyleCSS, element: INodeElementDom) {
  const el = element as any
  if (!el?.style?.setProperty) return
  for (const [k, v] of Object.entries(style)) {
    // setProperty requires kebab-case; camelCase keys silently no-op otherwise.
    el.style.setProperty(toKebab(k), v === null || v === undefined ? null : String(v))
  }
}

/**
 * Batch reactive writes onto the scheduler's paint phase so multiple stream
 * emissions within a single event-loop tick coalesce into one commit. The
 * task holds a pending value that gets overwritten if a new emission arrives
 * before the paint fires.
 */
function makePaintWriter<V>(scheduler: I$Scheduler, apply: (value: V) => void) {
  let pending: { value: V } | null = null
  let scheduled = false
  const task: ITask = {
    active: true,
    run(_time: ITime) {
      scheduled = false
      if (!task.active || pending === null) return
      const v = pending.value
      pending = null
      apply(v)
    },
    error() {
      task.active = false
    },
    [Symbol.dispose]() {
      task.active = false
      pending = null
    }
  }
  const submit = (value: V) => {
    if (!task.active) return
    pending = { value }
    if (!scheduled) {
      scheduled = true
      scheduler.paint(task)
    }
  }
  return { submit, task }
}

function applyStaticStyle(style: IStyleCSS, element: INodeElementDom) {
  // Static styles go through the shared stylesheet as classes so identical
  // style objects across the tree share one rule. Inline styles now only
  // carry reactive overrides (styleBehavior / styleInline), which cleanly
  // cascades: removing an inline prop falls back to the class rule.
  const el = element as any
  if (Object.keys(style).length === 0) return
  if (el?.classList) {
    const cls = createStyleRule(style)
    if (cls !== null) {
      el.classList.add(cls)
      return
    }
  }
  // No classList or no stylesheet available — fall back to inline.
  applyInlineStyle(style, element)
}

// Reactive styleBehavior handler: tracks the keys it set so that when the
// stream emits null (or a value missing some previous keys), the prior
// inline properties are removed. Since static styles are now class-based,
// removing an inline property lets the class rule cascade through — no need
// to track a baseline of static values.
function makeReactiveStyleApplier(element: INodeElementDom) {
  const el = element as any
  const prevKeys = new Set<string>()
  return (styleObj: IStyleCSS | null) => {
    if (!el?.style?.setProperty) return
    const next = styleObj ?? {}
    const nextKebab = new Map<string, unknown>()
    for (const [k, v] of Object.entries(next)) nextKebab.set(toKebab(k), v)
    // Remove keys that were set last time but aren't in this emission — the
    // browser cascades back to the static class rule (or nothing).
    for (const k of prevKeys) {
      if (!nextKebab.has(k)) el.style.removeProperty(k)
    }
    for (const [k, v] of nextKebab) {
      el.style.setProperty(k, v === null || v === undefined ? null : String(v))
    }
    prevKeys.clear()
    for (const k of nextKebab.keys()) prevKeys.add(k)
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
  applyStaticStyle(node.style, element)
  applyAttributes(node.attributes, element)

  const pseudoDisp =
    node.stylePseudo.length === 0
      ? disposeNone
      : (() => {
          const classes: string[] = []
          for (const entry of node.stylePseudo) {
            const cls = createStylePseudoRule(entry.class, entry.style)
            if (cls === null) continue
            classes.push(cls)
            element.classList?.add(cls)
          }
          return disposeWith(() => {
            for (const cls of classes) element.classList?.remove(cls)
          })
        })()

  // All reactive writes route through `scheduler.paint` so bursts of emissions
  // within a single event-loop tick coalesce into one paint commit per stream.
  // makePaintWriter holds a mutable "pending" value so intermediate emissions
  // are dropped and the last value wins — cheap back-pressure for hot sources.

  const propDisp =
    node.propBehavior.length === 0
      ? disposeNone
      : (() => {
          const disposables: Disposable[] = []
          for (const { key, value } of node.propBehavior) {
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
            const { submit, task } = makePaintWriter<IStyleCSS | null>(env.scheduler, styleObj => {
              applyInlineStyle(styleObj ?? {}, element)
            })
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

  // Reserve a placeholder comment node per segment up front; each slot mounts
  // its element BEFORE its placeholder. This pins DOM order to declaration
  // order regardless of which segment's stream emits first (async sources,
  // switchLatest swaps, etc.).
  const segmentDisposables = node.$segments.map(seg => {
    const placeholder = document.createComment('')
    element.insertBefore(placeholder, null)
    return renderSlotAt(seg, element, placeholder, env)
  })

  const childDisposables = disposeAll([
    styleInlineDisp,
    styleClass,
    attrBeh,
    pseudoDisp,
    propDisp,
    ...segmentDisposables
  ])

  return { el: element, childDisposables }
}

// Mount into the slot position marked by `anchor` (a comment node): each
// mounted element is inserted BEFORE the anchor, so the anchor acts as the
// trailing marker of the segment. On unmount the anchor stays in place, so
// re-emits drop into the same position.
function renderSlotAt(
  $slot: I$Slottable,
  parent: Element,
  anchor: Node,
  env: { scheduler: I$Scheduler; onError: (err: unknown) => void }
): Disposable {
  // Append-semantics: each slot emission mounts a new child at this
  // slot's position (before `anchor`). A child's own `SettableDisposable`
  // (set on `INode.disposable` by `createNode`) fires when upstream tears
  // its subscription down — e.g. `joinMap`'s `endInner` after
  // `until(remove)` ends a concurrent inner, or the outer slot disposing.
  // Firing the disposable removes just that child from the DOM, leaving
  // siblings from the same segment intact.
  //
  // `null` slot emissions (router.match unmount sentinel) drop ALL
  // current children of this slot at once.
  const mounted = new Set<{ el: Node; cleanup: Disposable }>()

  const unmountAll = () => {
    for (const m of mounted) {
      m.cleanup[Symbol.dispose]()
    }
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
        const entry = { el: m.el, cleanup: disposeNone }
        const remove = () => {
          if (!mounted.has(entry)) return
          mounted.delete(entry)
          m.childDisposables[Symbol.dispose]()
          if (entry.el.parentNode === parent) parent.removeChild(entry.el)
        }
        entry.cleanup = disposeWith(remove)
        mounted.add(entry)
        parent.insertBefore(entry.el, anchor)

        // If the mounted child is an INode, hook its per-instance
        // disposable: firing it (via upstream teardown) runs `remove`.
        const slottable = nodeOrText as { disposable?: { set?: (d: Disposable) => void } }
        if (slottable.disposable && typeof slottable.disposable.set === 'function') {
          try {
            slottable.disposable.set(entry.cleanup)
          } catch {
            // SettableDisposable throws if already set — ignore so a single
            // INode shared across subscriptions doesn't crash the renderer.
          }
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
    if (anchor.parentNode === parent) parent.removeChild(anchor)
  })
}

// Root-level slot: create a trailing anchor and route through renderSlotAt so
// the mount API surface is uniform (insertBefore only, no appendChild).
function renderSlot(
  $slot: I$Slottable,
  parent: Element,
  env: { scheduler: I$Scheduler; onError: (err: unknown) => void }
): Disposable {
  const anchor = document.createComment('')
  parent.insertBefore(anchor, null)
  return renderSlotAt($slot, parent, anchor, env)
}

export interface IRenderConfig {
  rootAttachment: Element
  $rootNode: I$Node
  scheduler?: I$Scheduler
  /**
   * Called on any error from the node stream or its descendants. Defaults to
   * `console.error`. Use to forward render errors into app telemetry.
   */
  onError?: (err: unknown) => void
}

export function render(config: IRenderConfig): Disposable {
  const env = {
    scheduler: config.scheduler ?? createDomScheduler(),
    onError: config.onError ?? ((err: unknown) => console.error('[aelea] render error', err))
  }

  const disposable = renderSlot(config.$rootNode as any, config.rootAttachment, env)

  return {
    [Symbol.dispose]() {
      disposable?.[Symbol.dispose]?.()
    }
  }
}
