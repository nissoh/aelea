// Renderer parity guard. Mounts a representative aelea tree (static styles,
// reactive styleInline / styleBehavior, static + reactive attributes, a
// multi-segment node, a switchLatest slot, dynamic $text, and a
// component+tether) into happy-dom under the synchronous scheduler, then
// snapshots:
//   1. the serialized DOM on mount,
//   2. the DOM after driving every reactive channel,
//   3. that dispose fully detaches,
//   4. the takumi resolved-tree for the same shape.
// These snapshots must stay byte-identical through the renderer overhaul.

import { beforeAll, describe, expect, test } from 'bun:test'
import { dropRoot, freshRoot, installDom, syncScheduler } from '../benchmark/lib/dom-env.js'
import { disposeWith, type IStream, type ITask, map, switchLatest, tap } from '../src/stream/index.js'
import { type IBehavior, multicast, state } from '../src/stream-extended/index.js'
import {
  $element,
  $node,
  $text,
  attr,
  attrBehavior,
  component,
  createDomScheduler,
  type IAttributeProperties,
  type IStyleCSS,
  nodeEvent,
  render,
  style,
  styleBehavior,
  styleInline
} from '../src/ui/index.js'
import { disabledOp } from '../src/ui-components/components/controllers/form.js'
import { observeManifest } from '../src/ui-renderer-takumi/snapshot.js'

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

beforeAll(() => {
  installDom()
})

// A hot, replayable source with a manual `next`. Under the sync scheduler
// state replays its latest value inline, so a fresh subscriber sees the
// current value immediately and `next` propagates synchronously.
function subject<T>(initial: T): { source: IStream<T>; next: (v: T) => void } {
  let push: ((v: T) => void) | null = null
  const base: IStream<T> = {
    run(sink, scheduler) {
      push = v => sink.event(scheduler.time(), v)
      return disposeWith(() => {
        push = null
      })
    }
  }
  const source = state(initial, base)
  return { source, next: v => push?.(v) }
}

function neverEmit<T>(): IStream<T> {
  return { run: () => disposeWith(() => {}) }
}

// A switchLatest over a node-shape choice. The inner is already a stream
// ($element(...)), so switchLatest has a real inner to dispose on swap.
function switchNode(toggle: IStream<boolean>): IStream<unknown> {
  return switchLatest(map(b => (b ? $element('em')($text('on')) : $element('s')($text('off'))), toggle))
}

// Normalize the counter-based static-style class names (ae-1, ae-2, …) to a
// stable appearance-ordered form so the snapshot is independent of the global
// rule counter's absolute value.
function normalizeAe(s: string): string {
  const seen = new Map<string, string>()
  return s.replace(/ae-\d+/g, m => {
    let v = seen.get(m)
    if (v === undefined) {
      v = `ae#${seen.size}`
      seen.set(m, v)
    }
    return v
  })
}

function serialize(node: Node): string {
  if (node.nodeType === 3) return JSON.stringify(node.nodeValue ?? '')
  if (node.nodeType === 8) return `<!--${node.nodeValue ?? ''}-->`
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const attrs = Array.from(el.attributes)
    .map(a => [a.name, a.value] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('')
  const children = Array.from(el.childNodes).map(serialize).join('')
  return `<${tag}${attrs}>${children}</${tag}>`
}

const dump = (root: Element): string => normalizeAe(Array.from(root.childNodes).map(serialize).join(''))

describe('DOM render parity', () => {
  test('representative tree: mount snapshot, reactive updates, dispose', () => {
    const text = subject('hello')
    const inline = subject<IStyleCSS>({ color: 'red' })
    const beh = subject<IStyleCSS | null>({ opacity: '0.5' })
    const at = subject<IAttributeProperties<{ 'data-n': number }> | null>({ 'data-n': 1 })
    const toggle = subject(true)

    const $tree = $node(style({ display: 'flex', padding: '4px' }), attr({ id: 'root', role: 'group' }))(
      $element('span')(styleInline(inline.source), styleBehavior(beh.source), attrBehavior(at.source))(
        $text(text.source)
      ),
      $element('div')($element('i')($text('seg-a')), $element('b')($text('seg-b'))),
      switchNode(toggle.source)
    )

    const root = freshRoot()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })

    expect(dump(root)).toBe(
      '<div class="ae#0" id="root" role="group"><span data-n="1" style="color: red; opacity: 0.5;">"hello"</span><div><i>"seg-a"</i><b>"seg-b"</b></div><em>"on"</em></div><!---->'
    )
    expect(root.querySelector('#root')).not.toBeNull()
    expect(root.querySelector('span')?.getAttribute('style')).toContain('color: red')
    expect(root.querySelector('span')?.textContent).toBe('hello')

    text.next('world')
    inline.next({ color: 'blue' })
    beh.next(null)
    at.next({ 'data-n': 2 })
    toggle.next(false)

    expect(dump(root)).toBe(
      '<div class="ae#0" id="root" role="group"><span data-n="2" style="color: blue;">"world"</span><div><i>"seg-a"</i><b>"seg-b"</b></div><s>"off"</s></div><!---->'
    )
    expect(root.querySelector('span')?.textContent).toBe('world')
    expect(root.querySelector('span')?.getAttribute('style')).toContain('color: blue')
    expect(root.querySelector('span')?.getAttribute('style') ?? '').not.toContain('opacity')
    expect(root.querySelector('span')?.getAttribute('data-n')).toBe('2')

    disp[Symbol.dispose]()
    expect(root.childNodes.length).toBe(0)
    dropRoot(root)
  })

  test('styleBehavior diff: drops keys absent from a later emit; idempotent re-emit', () => {
    const s = subject<IStyleCSS>({ color: 'red', opacity: '0.5' })
    const $tree = $element('span')(styleBehavior(s.source))()
    const root = freshRoot()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })
    const span = root.querySelector('span') as Element

    expect(span.getAttribute('style')).toContain('color: red')
    expect(span.getAttribute('style')).toContain('opacity')

    // opacity is absent from the next object (not explicitly null) -> removed
    s.next({ color: 'green' })
    expect(span.getAttribute('style')).toContain('color: green')
    expect(span.getAttribute('style') ?? '').not.toContain('opacity')

    // a fresh object with identical content -> no observable change
    s.next({ color: 'green' })
    expect(span.getAttribute('style')).toContain('color: green')

    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('out-of-order segment insert keeps DOM order (nextSiblingRef path)', () => {
    // segment 0 is dynamic (swaps on toggle); segment 1 is static. After the
    // initial in-order mount, swapping segment 0 re-mounts a node at an index
    // below the cursor max, exercising the scan-for-next-sibling insert path.
    const toggle = subject(true)
    const $tree = $node(switchNode(toggle.source), $element('hr')())

    const root = freshRoot()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })

    const host = root.firstChild as Element
    const order = () => Array.from(host.childNodes).map(n => (n as Element).tagName?.toLowerCase() ?? n.nodeType)
    expect(order()).toEqual(['em', 'hr'])

    toggle.next(false)
    expect(order()).toEqual(['s', 'hr'])

    toggle.next(true)
    expect(order()).toEqual(['em', 'hr'])

    disp[Symbol.dispose]()
    expect(root.childNodes.length).toBe(0)
    dropRoot(root)
  })

  test('disabledOp removes the disabled attribute when the stream emits false', () => {
    const d = subject<boolean>(true)
    const $btn = $element('button')(disabledOp(d.source))($text('go'))
    const root = freshRoot()
    const disp = render({ rootAttachment: root, $rootNode: $btn, scheduler: syncScheduler })
    const btn = root.querySelector('button') as Element

    expect(btn.hasAttribute('disabled')).toBe(true)
    d.next(false)
    // boolean `disabled` is a presence attribute — `false` must REMOVE it, not
    // set disabled="false" (which would keep the element disabled).
    expect(btn.hasAttribute('disabled')).toBe(false)
    d.next(true)
    expect(btn.hasAttribute('disabled')).toBe(true)

    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('component + tether: click flows to output; dispose detaches', () => {
    const seen: number[] = []
    let counter = 0

    const $Counter = component(([inc, incTether]: IBehavior<MouseEvent, number>) => [
      $element('button')(
        attr({ type: 'button' }),
        incTether(
          nodeEvent('click'),
          map(() => ++counter)
        )
      )($text('inc')),
      { inc }
    ])

    const $tree = $node($Counter({ inc: tap((v: number) => seen.push(v)) }))

    const root = freshRoot()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })

    const btn = root.querySelector('button') as unknown as HTMLElement
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('inc')

    btn.click()
    btn.click()
    expect(seen).toEqual([1, 2])

    disp[Symbol.dispose]()
    // Full teardown: subtree removed, element detached, and the click listener
    // detached so a post-dispose click no longer flows (the behavior consumer's
    // sampler subscriptions are now disposed — see behavior.ts disposeAll fix).
    expect(root.childNodes.length).toBe(0)
    expect(btn.isConnected).toBe(false)
    btn.click()
    expect(seen).toEqual([1, 2])
    dropRoot(root)
  })
})

describe('dynamic $text shared-source timing (gotcha-1 guard)', () => {
  // A shared source that emits 'V' once, on the asap AFTER its first subscriber.
  function makeShared(): IStream<string> {
    let emitted = false
    const base: IStream<string> = {
      run(sink, sch) {
        const t: ITask = {
          active: true,
          run() {
            if (!emitted) {
              emitted = true
              sink.event(sch.time(), 'V')
            }
          },
          error() {},
          [Symbol.dispose]() {}
        }
        return sch.asap(t)
      }
    }
    return multicast(base)
  }

  // Locks in that $text's prime-sub captures an asap-deferred shared emit even
  // when an earlier sibling (styleBehavior) is the multicast's first subscriber.
  // Without the prime the text registers one asap cycle too late and stays blank.
  test('text captures an asap-deferred shared emit consumed by an earlier sibling', async () => {
    const shared = makeShared()
    const $tree = $element('span')(styleBehavior(map(() => ({ color: 'red' }), shared)))(
      $text(map(v => `got:${v}`, shared))
    )
    const root = freshRoot()
    const scheduler = createDomScheduler()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler })
    await wait(60)
    expect((root.querySelector('span') as Element).textContent).toBe('got:V')
    disp[Symbol.dispose]()
    dropRoot(root)
  })
})

describe('takumi resolved-tree parity', () => {
  test('observeManifest materializes the same shape', () => {
    const text = subject('hi')
    const $tree = $node(style({ display: 'flex' }), attr({ id: 'card' }))(
      $element('span')(styleInline(state({ color: 'red' } as IStyleCSS, neverEmit())))($text(text.source)),
      $element('p')($text('static'))
    )

    const observer = observeManifest($tree, syncScheduler, { onDirty() {}, onError() {} })
    const resolved = observer.materialize()
    expect(resolved).toEqual({
      tag: 'div',
      style: { display: 'flex' },
      attributes: { id: 'card' },
      children: [
        { tag: 'span', style: { color: 'red' }, attributes: {}, children: ['hi'] },
        { tag: 'p', style: {}, attributes: {}, children: ['static'] }
      ]
    })
    expect(resolved?.tag).toBe('div')
    observer[Symbol.dispose]()
  })
})
