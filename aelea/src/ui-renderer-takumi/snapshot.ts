import { disposeNone, type IStream, type ITime } from '../stream/index.js'
import { stream } from '../stream-extended/index.js'
import {
  applyOwnedKeys,
  type IBindingSink,
  type IMountBackend,
  type IOwnedKeysWriter,
  MountContext,
  mountRoot
} from '../ui/backend.js'
import { createHeadlessScheduler } from '../ui/scheduler.js'
import type { I$Node, I$Scheduler, IAttributes, IRecipe, IStaticStyleEntry, IStyleCSS } from '../ui/types.js'

/**
 * A plain tree resolved from a live aelea subtree: string styles and
 * attributes, `ResolvedNode | string` children, no streams. Projectable to
 * takumi, HTML, or any other target.
 */
export interface ResolvedNode {
  tag: string
  style: Record<string, string>
  attributes: Record<string, string>
  children: Array<ResolvedNode | string>
}

export interface IManifestObserver extends Disposable {
  /** Walk current live state into a plain tree, or `null` if nothing mounted yet. */
  materialize(): ResolvedNode | null
}

interface IManifestHandlers {
  onDirty(): void
  onError(error: unknown): void
}

interface LiveNode {
  tag: string
  style: Record<string, string>
  attributes: Record<string, string>
  children: (LiveNode | LiveText)[]
}

interface LiveText {
  text: string
}

function assignStrings(target: Record<string, string>, source: Record<string, unknown>): void {
  for (const key in source) {
    const value = source[key]
    if (value !== null && value !== undefined) target[key] = String(value)
  }
}

class OwnedKeysSink implements IBindingSink<Record<string, unknown> | null> {
  private prev: Record<string, unknown> | null = null

  constructor(
    readonly target: Record<string, string>,
    readonly backend: ObserverBackend
  ) {}

  event(_time: ITime, value: Record<string, unknown> | null): void {
    applyOwnedKeys(this.prev, value, recordWriter, this.target)
    this.prev = value
    this.backend.dirty()
  }

  error(_time: ITime, error: unknown): void {
    this.backend.onError(error)
  }

  end(): void {}

  [Symbol.dispose](): void {}
}

const recordWriter: IOwnedKeysWriter<Record<string, string>> = {
  set(target, key, value) {
    target[key] = value
  },
  remove(target, key) {
    delete target[key]
  }
}

class TextSink implements IBindingSink<string> {
  constructor(
    readonly target: LiveText,
    readonly backend: ObserverBackend
  ) {}

  event(_time: ITime, value: string): void {
    this.target.text = value ?? ''
    this.backend.dirty()
  }

  error(_time: ITime, error: unknown): void {
    this.backend.onError(error)
  }

  end(): void {}

  [Symbol.dispose](): void {}
}

class InertSink implements IBindingSink<unknown> {
  constructor(readonly backend: ObserverBackend) {}

  event(): void {}

  error(_time: ITime, error: unknown): void {
    this.backend.onError(error)
  }

  end(): void {}

  [Symbol.dispose](): void {}
}

/**
 * The observer backend of the shared mount walk: elements are live records
 * the reactive channels write into, so a burst of emissions costs O(emits)
 * bookkeeping and `materialize` copies the tree once, on demand. Effects and
 * property writes have no meaning off the DOM and are inert.
 */
class ObserverBackend implements IMountBackend<LiveNode, LiveText> {
  constructor(
    readonly scheduler: I$Scheduler,
    readonly handlers: IManifestHandlers
  ) {}

  dirty = (): void => this.handlers.onDirty()

  onError(error: unknown): void {
    this.handlers.onError(error)
  }

  element(recipe: IRecipe<LiveNode>): LiveNode {
    return { tag: recipe.element.tag, style: {}, attributes: {}, children: [] }
  }

  text(value: string): LiveText {
    return { text: value }
  }

  textSink(text: LiveText): IBindingSink<string> {
    return new TextSink(text, this)
  }

  staticStyle(element: LiveNode, entries: readonly IStaticStyleEntry[]): void {
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].pseudo === null) assignStrings(element.style, entries[i].style as Record<string, unknown>)
    }
  }

  staticAttributes(element: LiveNode, attributes: IAttributes): void {
    assignStrings(element.attributes, attributes)
  }

  styleSink(element: LiveNode): IBindingSink<IStyleCSS | null> {
    return new OwnedKeysSink(element.style, this)
  }

  attributeSink(element: LiveNode): IBindingSink<IAttributes | null> {
    return new OwnedKeysSink(element.attributes, this)
  }

  propSink(): IBindingSink<unknown> {
    return new InertSink(this)
  }

  effect(): Disposable {
    return disposeNone
  }

  insert(parent: LiveNode, child: LiveNode | LiveText, before: LiveNode | LiveText | null): void {
    const at = before === null ? -1 : parent.children.indexOf(before)
    if (at === -1) parent.children.push(child)
    else parent.children.splice(at, 0, child)
    this.dirty()
  }

  unmount(parent: LiveNode, child: LiveNode | LiveText, subtree: Disposable): void {
    subtree[Symbol.dispose]()
    const at = parent.children.indexOf(child)
    if (at !== -1) {
      parent.children.splice(at, 1)
      this.dirty()
    }
  }
}

function resolve(node: LiveNode): ResolvedNode {
  const children: Array<ResolvedNode | string> = []
  for (const child of node.children) {
    if ('tag' in child) children.push(resolve(child))
    else if (child.text.length > 0) children.push(child.text)
  }
  return { tag: node.tag, style: { ...node.style }, attributes: { ...node.attributes }, children }
}

/**
 * Mount `$root` into a live observer and expose its resolved tree on demand.
 */
export function observeManifest($root: I$Node, scheduler: I$Scheduler, handlers: IManifestHandlers): IManifestObserver {
  const backend = new ObserverBackend(scheduler, handlers)
  const host: LiveNode = { tag: 'root', style: {}, attributes: {}, children: [] }
  const mounted = mountRoot(new MountContext(backend), $root as I$Node<LiveNode>, host, null)
  let disposed = false

  return {
    materialize() {
      for (const child of host.children) {
        if ('tag' in child) return resolve(child)
      }
      return null
    },
    [Symbol.dispose]() {
      if (disposed) return
      disposed = true
      mounted[Symbol.dispose]()
    }
  }
}

/**
 * Stream of `ResolvedNode` snapshots of `$node`: one coalesced snapshot per
 * asap batch, on mount and on every subsequent change. Most callers want
 * `renderToImage`, which settles and materializes once.
 */
export function snapshotStream(
  $node: I$Node,
  scheduler: I$Scheduler = createHeadlessScheduler()
): IStream<ResolvedNode> {
  return stream<ResolvedNode>(sink => {
    let observer: IManifestObserver | null = null
    let scheduled = false

    const emit = () => {
      scheduled = false
      const resolved = observer?.materialize()
      if (resolved) sink.event(scheduler.time(), resolved)
    }

    const scheduleEmit = () => {
      if (scheduled) return
      scheduled = true
      scheduler.asap({
        active: true,
        run: emit,
        error(_time: number, error: unknown) {
          sink.error(scheduler.time(), error)
        },
        [Symbol.dispose]() {
          scheduled = false
        }
      })
    }

    observer = observeManifest($node, scheduler, {
      onDirty: scheduleEmit,
      onError: error => sink.error(scheduler.time(), error)
    })

    return observer
  })
}
