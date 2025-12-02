import { merge, nullSink, op, tap } from '@/stream'
import { stream } from '@/stream-extended'
import type { I$Node, I$Scheduler, I$Slottable, IAttributeProperties, INode, IStyleCSS, ITextNode } from '@/ui'
import { createDomScheduler } from '@/ui'

interface ISnapshotEnv {
  scheduler: I$Scheduler
}

function ensureRaf(): void {
  const g = globalThis as any
  if (typeof g.requestAnimationFrame !== 'function') {
    g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16)
  }
  if (typeof g.cancelAnimationFrame !== 'function') {
    g.cancelAnimationFrame = (id: number) => clearTimeout(id)
  }
  if (typeof g.performance !== 'object' || typeof g.performance.now !== 'function') {
    g.performance = { now: () => Date.now() }
  }
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

function mergeAttributes(into: Record<string, string>, attrs: IAttributeProperties<any> | null) {
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
  children: Array<INode | string>
): INode {
  return {
    ...node,
    style,
    attributes: attrs,
    $segments: children as any
  }
}

function observeSlot(
  $slot: I$Slottable,
  env: ISnapshotEnv,
  onChild: (child: INode | string, dispose: Disposable) => void
): Disposable {
  return $slot.run(
    {
      event(_time, node) {
        if ('kind' in node && node.kind === 'text') {
          const textNode = node as ITextNode
          let textValue = typeof textNode.value === 'string' ? textNode.value : ''
          let textDispose: Disposable = { [Symbol.dispose]() {} }

          if (textNode.value && typeof textNode.value !== 'string') {
            textDispose = op(
              textNode.value,
              tap(val => {
                textValue = val ?? ''
                onChild(textValue, textDispose)
              })
            ).run(nullSink, env.scheduler) as unknown as Disposable
          }

          onChild(textValue, textDispose)
        } else if ('$segments' in node) {
          let childDispose: Disposable
          childDispose = observeNode(node as INode, env, childSnapshot => onChild(childSnapshot, childDispose))
          onChild(node as INode, childDispose)
        }
      },
      error(_time, err) {
        console.error('Manifest slot error', err)
      },
      end() {}
    },
    env.scheduler
  ) as unknown as Disposable
}

function observeNode(node: INode, env: ISnapshotEnv, push: (node: INode) => void): Disposable {
  const styleState: Record<string, string> = {}
  const attrState: Record<string, string> = {}
  const childDisposables: Disposable[] = []
  const children: Array<INode | string> = []

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
    const cloned = cloneNode(node, { ...styleState }, { ...attrState }, children)
    push(cloned)
  }

  if (typeof node.style === 'object') mergeStyle(styleState, node.style as IStyleCSS)
  if (typeof node.attributes === 'object' && Object.keys(node.attributes).length) {
    mergeAttributes(attrState, node.attributes as Record<string, any>)
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
          mergeAttributes(attrState, attr as IAttributeProperties<any>)
          scheduleEmit()
        })
      )
    )
    behaviorDisposables.push(merge(...streams).run(nullSink, env.scheduler))
  }

  const slotDisposables: Disposable[] = node.$segments.map(($slot, idx) =>
    observeSlot($slot, env, (childManifest, childDispose) => {
      childDisposables[idx]?.[Symbol.dispose]?.()
      childDisposables[idx] = childDispose
      children[idx] = childManifest
      scheduleEmit()
    })
  )

  emit()

  return {
    [Symbol.dispose]() {
      for (const d of behaviorDisposables) d?.[Symbol.dispose]?.()
      for (const d of slotDisposables) d?.[Symbol.dispose]?.()
      for (const d of childDisposables) d?.[Symbol.dispose]?.()
    }
  }
}

/**
 * Produce a stream of INode snapshots from a node stream.
 * Emits when root emits or behaviors/children change (debounced to paint).
 */
export function manifestFromNode($node: I$Node, scheduler: I$Scheduler = createDomScheduler()) {
  return stream((sink, sched) => {
    ensureRaf()
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
