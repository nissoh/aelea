import { disposeAll, disposeNone, type ISink, type IStream } from '../stream/index.js'
import { NODE_BRAND, TEXT_BRAND } from './node.js'
import type {
  I$Scheduler,
  I$Slottable,
  IAttributes,
  IEffect,
  INode,
  IRecipe,
  ISlottable,
  IStaticStyleEntry,
  IStyleCSS
} from './types.js'

export type IBindingSink<V> = ISink<V> & Disposable

/**
 * What a renderer supplies to the shared mount walk. Elements and text nodes
 * are opaque to the walk; every reactive channel is a sink the backend owns,
 * so batching and diffing stay renderer decisions.
 */
export interface IMountBackend<E, T> {
  readonly scheduler: I$Scheduler
  onError(error: unknown): void
  element(recipe: IRecipe<E>): E
  text(value: string): T
  textSink(text: T): IBindingSink<string>
  staticStyle(element: E, entries: readonly IStaticStyleEntry[]): void
  staticAttributes(element: E, attributes: IAttributes): void
  styleSink(element: E): IBindingSink<IStyleCSS | null>
  attributeSink(element: E): IBindingSink<IAttributes | null>
  propSink(element: E, key: string): IBindingSink<unknown>
  effect(element: E, apply: IEffect<E>): Disposable
  insert(parent: E, child: E | T, before: E | T | null): void
  unmount(parent: E, child: E | T, subtree: Disposable): void
}

export class MountContext<E, T> {
  reportedRemounts: WeakSet<object> | null = null

  constructor(readonly backend: IMountBackend<E, T>) {}
}

export interface IOwnedKeysWriter<Target> {
  set(target: Target, key: string, value: string): void
  remove(target: Target, key: string): void
}

/**
 * The one reactive-channel semantic: a channel owns the keys of its latest
 * emission. Keys missing from the next emission are removed, `null` removes
 * them all, unchanged values are not rewritten. Emitted objects are treated
 * as immutable, so the previous emission itself is the record of ownership.
 */
export function applyOwnedKeys<Target>(
  prev: object | null,
  next: object | null,
  writer: IOwnedKeysWriter<Target>,
  target: Target
): void {
  const before = prev as Record<string, unknown> | null
  const after = next as Record<string, unknown> | null
  if (before !== null) {
    for (const key in before) {
      if (before[key] == null) continue
      if (after === null || after[key] == null) writer.remove(target, key)
    }
  }
  if (after !== null) {
    for (const key in after) {
      const raw = after[key]
      if (raw == null) continue
      if (before !== null && before[key] === raw) continue
      writer.set(target, key, typeof raw === 'string' ? raw : String(raw))
    }
  }
}

type Sibling<E, T> = Slot<E, T> | E | T

/**
 * A dynamic segment: the set of children its stream has mounted, in emission
 * order, and where the next one goes. Static siblings are plain elements in
 * the same array, so ordering across the two costs one scan.
 */
class Slot<E, T> {
  readonly mounted = new Set<SlotEntry<E, T>>()

  constructor(
    readonly parent: E,
    readonly siblings: Sibling<E, T>[] | null,
    readonly index: number,
    readonly anchor: E | T | null
  ) {}

  refNode(): E | T | null {
    const siblings = this.siblings
    if (siblings === null) return this.anchor
    for (let i = this.index + 1; i < siblings.length; i++) {
      const sibling = siblings[i]
      if (sibling instanceof Slot) {
        for (const entry of sibling.mounted) return entry.el
      } else if (sibling !== undefined) {
        return sibling
      }
    }
    return null
  }

  clear(): void {
    for (const entry of this.mounted) entry[Symbol.dispose]()
    this.mounted.clear()
  }
}

class SlotEntry<E, T> implements Disposable {
  constructor(
    readonly el: E | T,
    readonly subtree: Disposable,
    readonly slot: Slot<E, T>,
    readonly backend: IMountBackend<E, T>
  ) {}

  [Symbol.dispose](): void {
    const mounted = this.slot.mounted
    if (!mounted.has(this)) return
    mounted.delete(this)
    this.backend.unmount(this.slot.parent, this.el, this.subtree)
  }
}

class SlotSubscription<E, T> implements Disposable {
  constructor(
    readonly subscription: Disposable,
    readonly slot: Slot<E, T>
  ) {}

  [Symbol.dispose](): void {
    this.subscription[Symbol.dispose]()
    this.slot.clear()
  }
}

export function mountRoot<E, T>(
  ctx: MountContext<E, T>,
  $root: I$Slottable<E>,
  parent: E,
  anchor: E | T | null
): Disposable {
  return runSlot(ctx, $root, new Slot<E, T>(parent, null, 0, anchor))
}

function toDisposable(out: Disposable[]): Disposable {
  return out.length === 0 ? disposeNone : out.length === 1 ? out[0] : disposeAll(out)
}

/**
 * Materialize a recipe. Everything it subscribes or schedules is pushed onto
 * `out`; static children flatten into the same list and are removed with
 * the element, so only dynamic segments carry slot bookkeeping.
 */
function mountRecipe<E, T>(ctx: MountContext<E, T>, recipe: IRecipe<E>, node: INode<E> | null, out: Disposable[]): E {
  const backend = ctx.backend
  const scheduler = backend.scheduler
  const el = backend.element(recipe)
  node?.mount.resolve(el)
  backend.staticStyle(el, recipe.staticStyles)
  backend.staticAttributes(el, recipe.attributes)

  const props = recipe.propBehavior
  for (let i = 0; i < props.length; i++) {
    const sink = backend.propSink(el, props[i].key)
    out.push(props[i].value.run(sink, scheduler), sink)
  }
  const styles = recipe.styleBehavior
  for (let i = 0; i < styles.length; i++) {
    const sink = backend.styleSink(el)
    out.push(styles[i].run(sink, scheduler), sink)
  }
  const attributes = recipe.attributesBehavior
  for (let i = 0; i < attributes.length; i++) {
    const sink = backend.attributeSink(el)
    out.push(attributes[i].run(sink, scheduler), sink)
  }
  const effects = recipe.effects
  for (let i = 0; i < effects.length; i++) out.push(backend.effect(el, effects[i]))

  const segments = recipe.$segments
  const count = segments.length
  if (count > 0) {
    const siblings: Sibling<E, T>[] = new Array(count)
    for (let i = 0; i < count; i++) {
      const $segment = segments[i]
      const branded = $segment as unknown as Record<symbol, unknown>
      const text = branded[TEXT_BRAND] as string | IStream<string> | undefined
      const child = branded[NODE_BRAND] as IRecipe<E> | undefined
      if (text !== undefined || child !== undefined) {
        try {
          const mounted =
            text !== undefined ? mountText(ctx, text, out) : mountRecipe(ctx, child as IRecipe<E>, null, out)
          backend.insert(el, mounted, null)
          siblings[i] = mounted
        } catch (err) {
          backend.onError(err)
        }
        continue
      }
      const slot = new Slot<E, T>(el, siblings, i, null)
      siblings[i] = slot
      out.push(runSlot(ctx, $segment, slot))
    }
  }
  return el
}

function mountText<E, T>(ctx: MountContext<E, T>, value: string | IStream<string>, out: Disposable[]): T {
  const backend = ctx.backend
  if (typeof value === 'string') return backend.text(value)
  const el = backend.text('')
  const sink = backend.textSink(el)
  out.push(value.run(sink, backend.scheduler), sink)
  return el
}

function mountChild<E, T>(ctx: MountContext<E, T>, child: ISlottable<E>, out: Disposable[]): E | T | null {
  try {
    return child.kind === 'text' ? mountText(ctx, child.value, out) : mountRecipe(ctx, child.recipe, child, out)
  } catch (err) {
    toDisposable(out)[Symbol.dispose]()
    ctx.backend.onError(err)
    return null
  }
}

function runSlot<E, T>(ctx: MountContext<E, T>, $slot: I$Slottable<E>, slot: Slot<E, T>): Disposable {
  const backend = ctx.backend
  const subscription = $slot.run(
    {
      event(_time, child) {
        if (child === null || child === undefined) {
          slot.clear()
          return
        }
        const out: Disposable[] = []
        const el = mountChild(ctx, child, out)
        if (el === null) return
        const entry = new SlotEntry(el, toDisposable(out), slot, backend)
        backend.insert(slot.parent, el, slot.refNode())
        slot.mounted.add(entry)
        try {
          child.disposable.set(entry)
        } catch (err) {
          const seen = (ctx.reportedRemounts ??= new WeakSet())
          if (!seen.has(child)) {
            seen.add(child)
            backend.onError(err)
          }
        }
      },
      error(_time, err) {
        backend.onError(err)
      },
      end() {}
    },
    backend.scheduler
  )
  return new SlotSubscription(subscription, slot)
}
