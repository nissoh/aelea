/**
 * Observe an aelea `I$Node` subtree and emit resolved `INode` snapshots as
 * the tree mounts and behaviors populate. The snapshot is a plain object
 * tree — styles as `Record<string, string>`, children as `INode | string`,
 * no streams — ready to be projected to a concrete output shape (React,
 * `@takumi-rs/helpers`, server HTML, etc.).
 *
 * Inlined from the prior `ui-renderer-manifest` package; lives alongside
 * the takumi-specific bits to keep the renderer self-contained.
 */

import { disposeWith, merge, nullSink, op, tap } from '../stream/index.js'
import { stream } from '../stream-extended/index.js'
import type {
  I$Node,
  I$Scheduler,
  I$Slottable,
  IAttributeProperties,
  INode,
  IStyleCSS,
  ITextNode
} from '../ui/index.js'
import { createHeadlessScheduler } from '../ui/index.js'

interface ISnapshotEnv {
  scheduler: I$Scheduler
}

function mergeStyle(into: Record<string, string>, styleObject: IStyleCSS | null) {
  if (styleObject === null) {
    for (const key of Object.keys(into)) delete into[key]
    return into
  }
  if (!styleObject) return into
  for (const [key, value] of Object.entries(styleObject)) {
    if (value === null || value === undefined) {
      delete into[key]
    } else {
      into[key] = String(value)
    }
  }
  return into
}

function mergeAttributes(into: Record<string, string>, attrs: IAttributeProperties<unknown> | null) {
  if (!attrs) return into
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) {
      delete into[key]
    } else {
      into[key] = String(value)
    }
  }
  return into
}

function cloneNode(
  node: INode,
  style: Record<string, string>,
  attrs: Record<string, string>,
  children: Array<INode | string | null>
): INode {
  return {
    ...node,
    style,
    attributes: attrs,
    // Drop null slots (unmount sentinels) from the emitted snapshot — they
    // are a lifecycle signal, not content to serialize.
    $segments: children.filter(c => c !== null) as any
  }
}

/**
 * Callbacks a slot's parent registers so the slot can report append-
 * semantics child lifecycle: a mount appends, an update changes the
 * value in-place at the same insertion position, a remove drops just
 * that child, and a drop-all discards every child the slot has.
 */
interface SlotHandler {
  onMount(child: INode | string): ChildEntry
  onDropAll(): void
}

interface ChildEntry {
  update(child: INode | string): void
  remove(): void
}

function observeSlot($slot: I$Slottable, env: ISnapshotEnv, handler: SlotHandler): Disposable {
  return $slot.run(
    {
      event(_time, node) {
        if (node === null || node === undefined) {
          handler.onDropAll()
          return
        }
        if ('kind' in node && node.kind === 'text') {
          const textNode = node as ITextNode
          const initial = typeof textNode.value === 'string' ? textNode.value : ''
          const entry = handler.onMount(initial)
          if (textNode.value && typeof textNode.value !== 'string') {
            op(
              textNode.value,
              tap(val => entry.update(val ?? ''))
            ).run(nullSink, env.scheduler)
          }
        } else if ('$segments' in node) {
          // observeNode publishes the initial snapshot via its own emit()
          // and re-pushes whenever the tree updates. Each slot event from
          // here is a NEW child entry — append-semantics.
          const entry = handler.onMount(node as INode)
          const inode = node as INode
          const nodeObs = observeNode(inode, env, snap => entry.update(snap))
          // When the INode's upstream subscription is torn down
          // (joinMap.endInner after until(remove), outer dispose, …), the
          // SettableDisposable on the INode fires. Hook removal to it.
          try {
            inode.disposable?.set?.(
              disposeWith(() => {
                entry.remove()
                nodeObs[Symbol.dispose]()
              })
            )
          } catch {
            // Already set — the INode's disposable is shared across
            // subscriptions; remove via nodeObs alone (outer dispose path
            // still catches this entry on teardown).
          }
        }
      },
      error(_time, err) {
        console.error('[aelea] snapshot slot error', err)
      },
      end() {}
    },
    env.scheduler
  ) as unknown as Disposable
}

type ChildToken = { value: INode | string }

function observeNode(node: INode, env: ISnapshotEnv, push: (node: INode) => void): Disposable {
  const styleState: Record<string, string> = {}
  const attrState: Record<string, string> = {}
  // Per-segment list of concurrent child entries, preserving declaration
  // order across segments AND insertion order within each segment (so
  // `joinMap(makeItem, list$)` accumulates children rather than
  // replacing). Each entry is an identity-bearing token so `.update(next)`
  // and `.remove()` target the specific child regardless of value equality.
  const segmentChildren: ChildToken[][] = node.$segments.map(() => [])

  let scheduled = false
  const scheduleEmit = () => {
    if (scheduled) return
    scheduled = true
    const task = {
      active: true,
      run: () => {
        if (!task.active) return
        scheduled = false
        emit()
      },
      error: () => {
        task.active = false
      },
      [Symbol.dispose]() {
        task.active = false
      }
    }
    env.scheduler.paint(task as any)
  }

  const emit = () => {
    // Flatten tokens → values, preserving segment + insertion order.
    const flat: Array<INode | string | null> = []
    for (const seg of segmentChildren) for (const t of seg) flat.push(t.value)
    const cloned = cloneNode(node, { ...styleState }, { ...attrState }, flat)
    push(cloned)
  }

  if (typeof node.style === 'object') mergeStyle(styleState, node.style as IStyleCSS)
  if (typeof node.attributes === 'object' && Object.keys(node.attributes).length) {
    mergeAttributes(attrState, node.attributes as IAttributeProperties<unknown>)
  }

  const behaviorDisposables: Disposable[] = []

  if (node.styleInline.length) {
    const inlineStreams = node.styleInline.map(sb =>
      op(
        sb,
        tap(styleObj => {
          mergeStyle(styleState, styleObj as IStyleCSS | null)
          scheduleEmit()
        })
      )
    )
    behaviorDisposables.push(merge(...inlineStreams).run(nullSink, env.scheduler))
  }

  if (node.styleBehavior.length) {
    const streams = node.styleBehavior.map(sb =>
      op(
        sb,
        tap(styleObj => {
          mergeStyle(styleState, styleObj as IStyleCSS | null)
          scheduleEmit()
        })
      )
    )
    behaviorDisposables.push(merge(...streams).run(nullSink, env.scheduler))
  }

  if (node.attributesBehavior.length) {
    const streams = node.attributesBehavior.map(attrs =>
      op(
        attrs,
        tap(attr => {
          mergeAttributes(attrState, attr as IAttributeProperties<unknown>)
          scheduleEmit()
        })
      )
    )
    behaviorDisposables.push(merge(...streams).run(nullSink, env.scheduler))
  }

  const slotDisposables: Disposable[] = node.$segments.map(($slot, idx) => {
    const bucket = segmentChildren[idx]
    return observeSlot($slot, env, {
      onMount(initial) {
        const token: ChildToken = { value: initial }
        bucket.push(token)
        scheduleEmit()
        return {
          update(next) {
            token.value = next
            scheduleEmit()
          },
          remove() {
            const i = bucket.indexOf(token)
            if (i !== -1) bucket.splice(i, 1)
            scheduleEmit()
          }
        }
      },
      onDropAll() {
        if (bucket.length === 0) return
        bucket.length = 0
        scheduleEmit()
      }
    })
  })

  emit()

  return {
    [Symbol.dispose]() {
      for (const d of behaviorDisposables) d?.[Symbol.dispose]?.()
      for (const d of slotDisposables) d?.[Symbol.dispose]?.()
    }
  }
}

/**
 * Stream of `INode` snapshots of `$node`. Emits once on mount, then again
 * on every paint-batched descendant update. Callers typically debounce to
 * a settle window and take the latest — `renderToImage` does this.
 */
export function snapshotStream($node: I$Node, scheduler: I$Scheduler = createHeadlessScheduler()) {
  return stream<INode>((sink, _sched) => {
    let rootObserver: Disposable | null = null

    const nodeDisposable = $node.run(
      {
        event(_time, node) {
          rootObserver?.[Symbol.dispose]?.()
          rootObserver = observeNode(node, { scheduler }, manifest => {
            sink.event(scheduler.time(), manifest)
          })
        },
        error(_time, err) {
          sink.error(scheduler.time(), err)
        },
        end() {
          sink.end?.(scheduler.time())
        }
      },
      scheduler
    ) as unknown as Disposable

    return {
      [Symbol.dispose]() {
        rootObserver?.[Symbol.dispose]?.()
        nodeDisposable?.[Symbol.dispose]?.()
      }
    }
  })
}
