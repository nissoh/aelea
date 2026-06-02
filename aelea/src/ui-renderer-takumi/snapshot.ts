/**
 * Observe an aelea `I$Node` subtree and resolve it into a plain
 * `ResolvedNode` tree on demand — styles and attributes as string records,
 * children as `ResolvedNode | string`, no streams. Renderer-agnostic: the
 * resolved tree can be projected to takumi, React, server HTML, etc.
 *
 * Design: the observer keeps *live* mutable state (per-channel style/attr
 * maps, an ordered list of child tokens) and bumps a dirty signal as
 * behaviors fire. It does **not** build a snapshot per event — `materialize`
 * walks the live state once, when the caller asks. `renderToImage` settles
 * the tree (deterministically, via the scheduler's idle signal) and then
 * materializes a single time, so a burst of behavior emissions during mount
 * costs O(emits) bookkeeping rather than O(emits × tree-size) clones.
 */

import { disposeWith, type IStream } from '../stream/index.js'
import { stream } from '../stream-extended/index.js'
import type { I$Node, I$Scheduler, I$Slottable, IAttributeProperties, INode, ITextNode } from '../ui/index.js'
import { createSettleScheduler } from './scheduler.js'

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

interface INodeObserver extends Disposable {
  materialize(): ResolvedNode
}

interface IManifestHandlers {
  onDirty(): void
  onError(error: unknown): void
}

function getTag(element: unknown): string {
  if (element !== null && typeof element === 'object') {
    const tag = (element as { tag?: unknown }).tag
    if (typeof tag === 'string') return tag
    const tagName = (element as { tagName?: unknown }).tagName
    if (typeof tagName === 'string') return tagName.toLowerCase()
  }
  return 'div'
}

/** Stringify a style/attribute object, dropping null/undefined entries. */
function toStringRecord(source: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!source) return out
  for (const key in source) {
    const value = source[key]
    if (value !== null && value !== undefined) out[key] = String(value)
  }
  return out
}

/** Run a stream purely for its side effects; errors are reported, not thrown. */
function runForEach<T>(
  source: IStream<T>,
  scheduler: I$Scheduler,
  onValue: (value: T) => void,
  onError: (error: unknown) => void
): Disposable {
  return source.run(
    {
      event(_time, value) {
        onValue(value)
      },
      error(_time, error) {
        onError(error)
      },
      end() {}
    },
    scheduler
  ) as unknown as Disposable
}

type ChildToken = { kind: 'text'; text: string } | { kind: 'node'; obs: INodeObserver }

function observeSlot(
  $slot: I$Slottable,
  scheduler: I$Scheduler,
  handlers: IManifestHandlers,
  bucket: ChildToken[]
): Disposable {
  const childDisposables: Disposable[] = []

  const slotDisposable = $slot.run(
    {
      event(_time, node) {
        if (node === null || node === undefined) {
          // Unmount sentinel — the slot dropped all of its children.
          if (bucket.length > 0) {
            bucket.length = 0
            handlers.onDirty()
          }
          return
        }

        if ('kind' in node && node.kind === 'text') {
          const textNode = node as ITextNode
          const token: ChildToken = {
            kind: 'text',
            text: typeof textNode.value === 'string' ? textNode.value : ''
          }
          bucket.push(token)
          handlers.onDirty()
          if (textNode.value && typeof textNode.value !== 'string') {
            childDisposables.push(
              runForEach(
                textNode.value,
                scheduler,
                value => {
                  token.text = value ?? ''
                  handlers.onDirty()
                },
                handlers.onError
              )
            )
          }
          return
        }

        if ('$segments' in node) {
          const inode = node as INode
          const childObs = observeNode(inode, scheduler, handlers)
          const token: ChildToken = { kind: 'node', obs: childObs }
          bucket.push(token)
          childDisposables.push(childObs)
          handlers.onDirty()

          // When the child's upstream subscription tears down (e.g.
          // joinMap.endInner after until(remove), or an outer dispose), the
          // node's SettableDisposable fires — drop just this child then.
          const removal = disposeWith(() => {
            const i = bucket.indexOf(token)
            if (i !== -1) {
              bucket.splice(i, 1)
              handlers.onDirty()
            }
            childObs[Symbol.dispose]()
          })
          try {
            inode.disposable?.set?.(removal)
          } catch {
            // Already set — the disposable is shared across subscriptions.
            // The parent's dispose still tears this child down via
            // childDisposables, so removal is covered.
          }
        }
      },
      error(_time, error) {
        handlers.onError(error)
      },
      end() {}
    },
    scheduler
  ) as unknown as Disposable

  return {
    [Symbol.dispose]() {
      slotDisposable[Symbol.dispose]?.()
      for (const d of childDisposables) d[Symbol.dispose]?.()
    }
  }
}

function observeNode(node: INode, scheduler: I$Scheduler, handlers: IManifestHandlers): INodeObserver {
  const tag = getTag(node.element)

  // Style is computed from independent layers so a channel that re-emits a
  // partial object (or `null` to clear) only ever rewrites its own keys —
  // it can't clobber a key another channel still owns. Merge order at
  // materialize time is: static < inline < behavior.
  const staticStyle: Record<string, string> = {}
  for (const entry of node.staticStyles) {
    if (entry.pseudo === null) Object.assign(staticStyle, toStringRecord(entry.style as Record<string, unknown>))
  }
  const inlineLayers: Record<string, string>[] = node.styleInline.map(() => ({}))
  const behaviorLayers: Record<string, string>[] = node.styleBehavior.map(() => ({}))

  const staticAttr = toStringRecord(node.attributes as Record<string, unknown>)
  const attrLayers: Record<string, string>[] = node.attributesBehavior.map(() => ({}))

  const segmentChildren: ChildToken[][] = node.$segments.map(() => [])

  const disposables: Disposable[] = []
  let disposed = false

  node.styleInline.forEach((styleStream, i) => {
    disposables.push(
      runForEach(
        styleStream,
        scheduler,
        styleObj => {
          inlineLayers[i] = toStringRecord(styleObj as Record<string, unknown> | null)
          handlers.onDirty()
        },
        handlers.onError
      )
    )
  })

  node.styleBehavior.forEach((styleStream, i) => {
    disposables.push(
      runForEach(
        styleStream,
        scheduler,
        styleObj => {
          behaviorLayers[i] = toStringRecord(styleObj as Record<string, unknown> | null)
          handlers.onDirty()
        },
        handlers.onError
      )
    )
  })

  node.attributesBehavior.forEach((attrStream, i) => {
    disposables.push(
      runForEach(
        attrStream,
        scheduler,
        attrs => {
          attrLayers[i] = toStringRecord(attrs as IAttributeProperties<unknown> | null)
          handlers.onDirty()
        },
        handlers.onError
      )
    )
  })

  node.$segments.forEach(($slot, idx) => {
    disposables.push(observeSlot($slot, scheduler, handlers, segmentChildren[idx]))
  })

  return {
    materialize(): ResolvedNode {
      const style: Record<string, string> = { ...staticStyle }
      for (const layer of inlineLayers) Object.assign(style, layer)
      for (const layer of behaviorLayers) Object.assign(style, layer)

      const attributes: Record<string, string> = { ...staticAttr }
      for (const layer of attrLayers) Object.assign(attributes, layer)

      const children: Array<ResolvedNode | string> = []
      for (const segment of segmentChildren) {
        for (const token of segment) {
          if (token.kind === 'text') {
            if (token.text.length > 0) children.push(token.text)
          } else {
            children.push(token.obs.materialize())
          }
        }
      }

      return { tag, style, attributes, children }
    },
    [Symbol.dispose]() {
      if (disposed) return
      disposed = true
      for (const d of disposables) d[Symbol.dispose]?.()
    }
  }
}

/**
 * Subscribe `$root` and expose a live observer over the resolved tree.
 * Re-subscribes the whole tree if the root stream emits a new node.
 */
export function observeManifest($root: I$Node, scheduler: I$Scheduler, handlers: IManifestHandlers): IManifestObserver {
  let rootObserver: INodeObserver | null = null
  let disposed = false

  const rootDisposable = $root.run(
    {
      event(_time, node) {
        rootObserver?.[Symbol.dispose]()
        rootObserver = observeNode(node as INode, scheduler, handlers)
        handlers.onDirty()
      },
      error(_time, error) {
        handlers.onError(error)
      },
      end() {}
    },
    scheduler
  ) as unknown as Disposable

  return {
    materialize: () => (rootObserver === null ? null : rootObserver.materialize()),
    [Symbol.dispose]() {
      if (disposed) return
      disposed = true
      rootObserver?.[Symbol.dispose]()
      rootDisposable[Symbol.dispose]?.()
    }
  }
}

/**
 * Stream of `ResolvedNode` snapshots of `$node`. Emits a coalesced snapshot
 * (one per microtask batch) on mount and on every subsequent change. Most
 * callers want `renderToImage`, which settles deterministically and
 * materializes once; this is for authors driving their own projection.
 */
export function snapshotStream($node: I$Node, scheduler: I$Scheduler = createSettleScheduler()): IStream<ResolvedNode> {
  return stream<ResolvedNode>((sink, _scheduler) => {
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

    return {
      [Symbol.dispose]() {
        observer?.[Symbol.dispose]()
      }
    }
  })
}
