import { disposeAll, disposeNone, disposeWith, type ISink, type ITask, type ITime } from '../stream/index.js'
import type { MountPort } from '../ui/mount.js'
import { EMPTY_SEGMENTS, type IElementDescriptor, type IStaticNodeBrand, NODE_BRAND, TEXT_BRAND } from '../ui/node.js'
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
  let el: INodeElementDom
  if (desc && typeof desc === 'object' && desc.native) {
    el = desc.native as INodeElementDom
  } else {
    const tag = desc?.tag ?? 'div'
    el = desc?.namespace === 'svg' ? (document.createElementNS(SVG_NS, tag) as SVGElement) : document.createElement(tag)
    // Legacy write-back, kept one release — nodeEvent's fallback duck-walk
    // and external consumers still read it.
    if (desc && typeof desc === 'object') desc.native = el
  }
  ;(node.mount as MountPort<INodeElementDom> | undefined)?.resolve?.(el)
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

interface IRenderEnv {
  scheduler: I$Scheduler
  onError: (err: unknown) => void
  committer: Committer
  // Root element of the subtree currently being torn down. Descendant entries
  // (checked by containment, so a re-entrant dispose of an UNRELATED entry is
  // unaffected) skip their own removeChild — the root detaches once for the
  // whole subtree.
  discardingRoot: Node | null
  // Manifests whose double-mount was already reported — shared/cached
  // manifests (state()-replayed views) legitimately remount, so the protocol
  // violation is reported once per manifest, not once per remount.
  reportedRemounts: WeakSet<object> | null
}

type IBindingChannel = 'style' | 'styleInline' | 'attr' | 'prop' | 'text'

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

// The single commit point per render tree: bindings enqueue onto a dirty
// list, ONE paint task flushes the whole frame's writes (previously one paint
// task per binding per frame). Each apply is individually guarded so one bad
// write cannot starve the rest of the frame, and the dev-mode journal and
// binding registry hang off the one place every write already passes.
class Committer implements ITask {
  active = true
  private dirtyList: BindingEffect<unknown>[] = []
  private scheduled = false

  // dev-mode surfaces (null unless render({ devtool: true })). The registry
  // holds LIVE bindings only — disposed effects deregister so long devtool
  // sessions don't pin unmounted elements.
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
        // flush guards its own apply; only a throwing user onError reaches
        // here — surface it without abandoning the rest of the batch (a
        // dropped entry would keep dirty=false with the write lost, and any
        // still-dirty entries would be frozen forever).
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

// One object per reactive binding: the stream sink, the paint-coalescing
// mailbox, and the DOM applier fused into a single monomorphic class
// (previously a sink literal + writer task + applier closure per binding).
// Coalescing is last-write-wins per frame — except attrs, which are patches,
// so pending patches merge (dropping an unflushed patch would lose keys, not
// just intermediates).
class BindingEffect<V> implements ISink<V> {
  active = true
  dirty = false
  private pending: V | undefined
  private hasPending = false
  private prev: Map<string, string> | null = null
  private lastObj: unknown

  constructor(
    readonly channel: IBindingChannel,
    readonly el: any,
    readonly env: IRenderEnv,
    readonly key: string | null = null
  ) {
    if (env.committer.registry !== null) {
      env.committer.totalBindings++
      env.committer.registry.add(this as BindingEffect<unknown>)
    }
  }

  event(_time: ITime, value: V): void {
    if (!this.active) return
    if (this.channel === 'attr') {
      if (value == null) return
      this.pending = this.hasPending ? (Object.assign({}, this.pending, value) as V) : value
    } else {
      this.pending = value
    }
    this.hasPending = true
    this.env.committer.enqueue(this as BindingEffect<unknown>)
  }

  // Called by the committer's frame flush. Each apply is guarded: the binding
  // stays live — a bad value must not kill the channel for subsequent good
  // values, nor starve the other bindings in the batch.
  flush(time: ITime): void {
    if (!this.active || !this.hasPending) return
    const value = this.pending as V
    this.pending = undefined
    this.hasPending = false
    try {
      this.apply(value)
      this.env.committer.record(time, this.channel, value)
    } catch (err) {
      this.env.onError(err)
    }
  }

  error(_time: ITime, err: unknown): void {
    this.env.onError(err)
  }

  end(): void {}

  [Symbol.dispose](): void {
    this.active = false
    this.pending = undefined
    this.hasPending = false
    this.env.committer.registry?.delete(this as BindingEffect<unknown>)
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
        applyAttributes(value as IAttributeProperties<unknown> | null, this.el)
        return
      default:
        this.applyStyle(value as unknown as IStyleCSS | null)
    }
  }

  private applyStyle(styleObj: IStyleCSS | null): void {
    if (styleObj === this.lastObj) return
    this.lastObj = styleObj
    const el = this.el
    if (!el?.style?.setProperty) return
    const next = styleObj ?? {}
    if (this.prev === null) {
      const applied = new Map<string, string>()
      for (const k in next) {
        const raw = (next as any)[k]
        if (raw == null) continue
        const v = typeof raw === 'string' ? raw : String(raw)
        applied.set(k, v)
        el.style.setProperty(toKebab(k), v)
      }
      this.prev = applied
      return
    }
    for (const k of this.prev.keys()) {
      if ((next as any)[k] == null) {
        el.style.removeProperty(toKebab(k))
        this.prev.delete(k)
      }
    }
    for (const k in next) {
      const raw = (next as any)[k]
      if (raw == null) continue
      const v = typeof raw === 'string' ? raw : String(raw)
      if (this.prev.get(k) === v) continue
      el.style.setProperty(toKebab(k), v)
      this.prev.set(k, v)
    }
  }
}

function applyStaticStyle(staticStyles: INode<INodeElementDom>['staticStyles'], element: INodeElementDom) {
  if (staticStyles.length === 0) return
  const el = element as any
  const hasClassList = !!el?.classList
  for (let i = 0; i < staticStyles.length; i++) {
    const entry = staticStyles[i]
    if (hasClassList) {
      // Entries are allocated once per style() call, so the resolved class
      // name caches on the entry itself — one property load on every mount
      // after the first instead of two cache probes.
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

// The reactive/segment surface shared by INode manifests and static-node
// brands — both carry the same channel fields.
type INodeChannels = Pick<
  INode<INodeElementDom>,
  '$segments' | 'styleBehavior' | 'styleInline' | 'propBehavior' | 'attributesBehavior'
>

function mountNodeOrText(
  nodeOrText: NonNullable<ISlotChild>,
  env: IRenderEnv
): { el: Node; childDisposables: Disposable } {
  if ('kind' in nodeOrText && nodeOrText.kind === 'text') {
    const el = document.createTextNode('')
    const source = (nodeOrText as ITextNode).value
    if (typeof source === 'string') {
      el.nodeValue = source ?? ''
      return { el, childDisposables: disposeNone }
    }
    if (source) {
      const effect = new BindingEffect<string>('text', el, env)
      const subDisp = source.run(effect, env.scheduler)
      return { el, childDisposables: disposeAll([subDisp, effect]) }
    }
    return { el, childDisposables: disposeNone }
  }

  const node = nodeOrText as INode<INodeElementDom>
  const element = materializeElement(node)
  applyStaticStyle(node.staticStyles, element)
  applyAttributes(node.attributes, element)

  return { el: element, childDisposables: bindNodeChannels(node, element, env) }
}

// Mount an op-free branded node inline: no per-node stream subscription, no
// SettableDisposable, no scheduled emission — the recipe materializes in the
// same pass as its parent. Lifecycle is owned entirely by the enclosing slot
// entry (nothing external can observe a branded node: op-free means no tether
// ever sees it).
function mountBrandedNode(
  brand: IStaticNodeBrand<INodeElementDom>,
  env: IRenderEnv
): { el: Node; childDisposables: Disposable } {
  const node: INode<INodeElementDom> = { element: brand.createElement() } as INode<INodeElementDom>
  const element = materializeElement(node)
  applyStaticStyle(brand.staticStyles, element)
  applyAttributes(brand.attributes, element)
  return { el: element, childDisposables: bindNodeChannels(brand as INodeChannels, element, env) }
}

function tryMountBranded($slot: I$Slottable, env: IRenderEnv): { el: Node; childDisposables: Disposable } | null {
  const slot = $slot as unknown as Record<symbol, unknown>
  const staticText = slot[TEXT_BRAND]
  if (staticText !== undefined) {
    const el = document.createTextNode('')
    el.nodeValue = (staticText as string) ?? ''
    return { el, childDisposables: disposeNone }
  }
  const brand = slot[NODE_BRAND] as IStaticNodeBrand<INodeElementDom> | undefined
  if (brand === undefined) return null
  return mountBrandedNode(brand, env)
}

function bindNodeChannels(node: INodeChannels, element: INodeElementDom, env: IRenderEnv): Disposable {
  const disposables: Disposable[] = []
  try {
    return bindNodeChannelsInto(node, element, env, disposables)
  } catch (err) {
    // A throwing subscription mid-bind must not leak the already-started ones.
    disposeAll(disposables)[Symbol.dispose]()
    throw err
  }
}

function bindNodeChannelsInto(
  node: INodeChannels,
  element: INodeElementDom,
  env: IRenderEnv,
  disposables: Disposable[]
): Disposable {
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
        error(_time, err) {
          task.active = false
          env.onError(err)
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
    const effect = new BindingEffect<unknown>('prop', element, env, key)
    disposables.push(value.run(effect, env.scheduler), effect)
  }

  for (const sb of node.styleInline) {
    const effect = new BindingEffect<IStyleCSS | null>('styleInline', element, env)
    disposables.push(sb.run(effect, env.scheduler), effect)
  }

  for (const sb of node.styleBehavior) {
    const effect = new BindingEffect<IStyleCSS | null>('style', element, env)
    disposables.push(sb.run(effect, env.scheduler), effect)
  }

  for (const attrs of node.attributesBehavior) {
    const effect = new BindingEffect<IAttributeProperties<unknown> | null | undefined>('attr', element, env)
    disposables.push(attrs.run(effect, env.scheduler), effect)
  }

  // Childless nodes share the EMPTY_SEGMENTS singleton — skip the per-segment
  // slot machinery (a Set, a cursor, a subscription to `never`) entirely.
  if ((node.$segments as readonly unknown[]) !== EMPTY_SEGMENTS) {
    const slotSets: Set<SlotEntry>[] = node.$segments.map(() => new Set())
    const segCursor = { max: -1 }
    for (let segIdx = 0; segIdx < node.$segments.length; segIdx++) {
      disposables.push(renderSegmentSlot(node.$segments[segIdx], element, slotSets, segIdx, segCursor, env))
    }
  }

  return disposables.length === 0 ? disposeNone : disposeAll(disposables)
}

// One mounted child: the DOM node plus its subtree's disposables, disposable
// itself (this is what the manifest's SettableDisposable is set to). Removing
// the own element happens only at the outermost entry of a teardown — while
// `env.discarding` is set, descendants dispose subscriptions without touching
// the already-detached DOM.
class SlotEntry implements Disposable {
  constructor(
    readonly el: Node,
    readonly childDisposables: Disposable,
    readonly parent: Element,
    readonly mounted: Set<SlotEntry>,
    readonly env: IRenderEnv
  ) {}

  [Symbol.dispose](): void {
    if (!this.mounted.has(this)) return
    this.mounted.delete(this)
    const env = this.env

    // Descendant of the subtree being torn down: subscriptions only, the
    // discard root's single removeChild covers the DOM.
    if (env.discardingRoot !== null && env.discardingRoot.contains(this.el)) {
      this.childDisposables[Symbol.dispose]()
      return
    }

    // Outermost teardown of an attached entry: dispose the subtree first
    // (bindings and cleanups still see an attached element, and descendants
    // skip per-node removals via the containment check), then detach once.
    if (env.discardingRoot === null && this.el.parentNode === this.parent) {
      env.discardingRoot = this.el
      try {
        this.childDisposables[Symbol.dispose]()
      } finally {
        env.discardingRoot = null
      }
      if (this.el.parentNode === this.parent) {
        this.parent.removeChild(this.el)
      }
      return
    }

    // Reparented element, or an unrelated entry disposed re-entrantly during
    // another subtree's cascade: per-entry removal, exactly the old contract.
    this.childDisposables[Symbol.dispose]()
    if (this.el.parentNode === this.parent) {
      this.parent.removeChild(this.el)
    }
  }
}

function runSlot(
  $slot: I$Slottable,
  parent: Element,
  mounted: Set<SlotEntry>,
  insert: (el: Node) => void,
  env: IRenderEnv
): Disposable {
  const unmountAll = () => {
    for (const m of mounted) m[Symbol.dispose]()
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
        const entry = new SlotEntry(m.el, m.childDisposables, parent, mounted, env)
        insert(entry.el)
        mounted.add(entry)

        const slottable = nodeOrText as { disposable?: { set?: (d: Disposable) => void } }
        if (slottable.disposable && typeof slottable.disposable.set === 'function') {
          try {
            slottable.disposable.set(entry)
          } catch (err) {
            // A second set means this manifest value reached two mounts — a
            // protocol violation that must surface, not vanish. Cached
            // manifests remount legitimately, so report once per manifest.
            const seen = (env.reportedRemounts ??= new WeakSet())
            if (!seen.has(nodeOrText)) {
              seen.add(nodeOrText)
              env.onError(err)
            }
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
  })
}

function firstNodeOf(set: Set<SlotEntry>): Node | null {
  for (const e of set) return e.el
  return null
}

function nextSiblingRef(slotSets: Set<SlotEntry>[], segIdx: number): Node | null {
  for (let i = segIdx + 1; i < slotSets.length; i++) {
    const ref = firstNodeOf(slotSets[i])
    if (ref !== null) return ref
  }
  return null
}

function renderSegmentSlot(
  $slot: I$Slottable,
  parent: Element,
  slotSets: Set<SlotEntry>[],
  segIdx: number,
  segCursor: { max: number },
  env: IRenderEnv
): Disposable {
  const mounted = slotSets[segIdx]
  const insert = (el: Node) => {
    if (segIdx >= segCursor.max) {
      segCursor.max = segIdx
      parent.insertBefore(el, null)
    } else {
      parent.insertBefore(el, nextSiblingRef(slotSets, segIdx))
    }
  }

  // Static fast path: an op-free branded child mounts inline in the parent's
  // pass — no stream subscription, no scheduled emission. The entry rides the
  // exact same slot bookkeeping, so ordering and teardown are unchanged. A
  // throwing branded mount is isolated to its own segment (matching the task
  // isolation the legacy async path gets from the scheduler guard).
  try {
    const branded = tryMountBranded($slot, env)
    if (branded !== null) {
      const entry = new SlotEntry(branded.el, branded.childDisposables, parent, mounted, env)
      insert(entry.el)
      mounted.add(entry)
      return entry
    }
  } catch (err) {
    env.onError(err)
    return disposeNone
  }

  return runSlot($slot, parent, mounted, insert, env)
}

function renderRootSlot($slot: I$Slottable, parent: Element, env: IRenderEnv): Disposable {
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
  devtool?: boolean
}

export interface IRenderResult extends Disposable {
  devtool?: IRenderDevtool
}

export function render(config: IRenderConfig): IRenderResult {
  const scheduler = config.scheduler ?? createDomScheduler()
  const onError = config.onError ?? ((err: unknown) => console.error('[aelea] render error', err))
  const committer = new Committer(scheduler, onError)
  const env: IRenderEnv = {
    scheduler,
    onError,
    committer,
    discardingRoot: null,
    reportedRemounts: null
  }

  if (config.devtool) {
    committer.journal = []
    committer.registry = new Set()
  }

  const disposable = renderRootSlot(config.$rootNode as any, config.rootAttachment, env)

  const result: IRenderResult = {
    [Symbol.dispose]() {
      committer[Symbol.dispose]()
      disposable?.[Symbol.dispose]?.()
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
