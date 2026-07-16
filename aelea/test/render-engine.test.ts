// Pins for the engine-overhaul steps 1-4: scheduler error isolation (F1),
// paint coalescing (incl. dispose-with-pending), attr patch merging (F5),
// copy-on-emit decorator demotion (F4), $text targeted disposal (F3),
// double-mount reporting (F2), multi-emission slot semantics, and
// real-DomScheduler mount parity with the sync scheduler.

import { beforeAll, describe, expect, test } from 'bun:test'
import { dropRoot, freshRoot, installDom, syncScheduler } from '../benchmark/lib/dom-env.js'
import { disposeWith, type IStream, type ITask, map, merge, switchLatest } from '../src/stream/index.js'
import { behavior, type IBehavior, multicast, state } from '../src/stream-extended/index.js'
import type { I$Node, I$Slottable, IStyleCSS } from '../src/ui/index.js'
import {
  $element,
  $text,
  $wrapNativeElement,
  attr,
  attrBehavior,
  component,
  createDomScheduler,
  effectProp,
  effectRun,
  MountPort,
  nodeEvent,
  port,
  render,
  style,
  styleBehavior,
  styleInline
} from '../src/ui/index.js'
import { NODE_BRAND, TEXT_BRAND } from '../src/ui/node.js'

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

beforeAll(() => {
  installDom()
})

function pushStream<T>(): { source: IStream<T>; next: (v: T) => void } {
  let push: ((v: T) => void) | null = null
  const source: IStream<T> = {
    run(sink, scheduler) {
      push = v => sink.event(scheduler.time(), v)
      return disposeWith(() => {
        push = null
      })
    }
  }
  return { source, next: v => push?.(v) }
}

function subject<T>(initial: T): { source: IStream<T>; next: (v: T) => void } {
  const { source, next } = pushStream<T>()
  return { source: state(initial, source), next }
}

function constantState<T extends NonNullable<unknown>>(value: T): IStream<T> {
  const never: IStream<T> = { run: () => disposeWith(() => {}) }
  return state(value, never)
}

const mkTask = (run: (time: number) => void, onError?: (err: unknown) => void): ITask => ({
  active: true,
  run,
  error: (_t, e) => onError?.(e),
  [Symbol.dispose]() {
    this.active = false
  }
})

describe('scheduler error isolation (F1)', () => {
  test('a throwing paint task does not freeze subsequent paint flushes', async () => {
    const scheduler = createDomScheduler()
    const errors: unknown[] = []
    let laterRan = false

    scheduler.paint(
      mkTask(
        () => {
          throw new Error('bad write')
        },
        e => errors.push(e)
      )
    )
    await wait(50)

    scheduler.paint(
      mkTask(() => {
        laterRan = true
      })
    )
    await wait(50)

    expect(laterRan).toBe(true)
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('bad write')
    expect(scheduler.stats?.().taskErrors).toBe(1)
  })

  test('a throwing delayed task routes to task.error instead of escaping the timer', async () => {
    const scheduler = createDomScheduler()
    const errors: unknown[] = []
    scheduler.delay(
      mkTask(
        () => {
          throw new Error('delayed boom')
        },
        e => errors.push(e)
      ),
      5
    )
    await wait(40)
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('delayed boom')
  })

  test('a throwing asap task does not kill the rest of its batch', async () => {
    const scheduler = createDomScheduler()
    const ran: string[] = []

    scheduler.asap(
      mkTask(() => {
        ran.push('a')
      })
    )
    scheduler.asap(
      mkTask(() => {
        throw new Error('boom')
      })
    )
    scheduler.asap(
      mkTask(() => {
        ran.push('c')
      })
    )
    await wait(20)

    expect(ran).toEqual(['a', 'c'])
  })
})

describe('paint coalescing', () => {
  test('same-frame emissions coalesce to one write of the latest value', async () => {
    const scheduler = createDomScheduler()
    const root = freshRoot()
    const { source, next } = pushStream<string>()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(effectProp('myProp', source))(),
      scheduler
    })
    await wait(60)

    const el = root.querySelector('div') as HTMLElement & { myProp?: string }
    expect(el).toBeTruthy()
    let writes = 0
    let written: unknown
    Object.defineProperty(el, 'myProp', {
      set(v) {
        writes++
        written = v
      },
      configurable: true
    })

    next('a')
    next('b')
    next('c')
    await wait(60)

    expect(writes).toBe(1)
    expect(written).toBe('c')
    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('disposing before the frame drops the pending write (current contract)', async () => {
    const scheduler = createDomScheduler()
    const root = freshRoot()
    const { source, next } = pushStream<string>()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(effectProp('myProp', source))(),
      scheduler
    })
    await wait(60)

    const el = root.querySelector('div') as HTMLElement & { myProp?: string }
    let writes = 0
    Object.defineProperty(el, 'myProp', {
      set() {
        writes++
      },
      configurable: true
    })

    next('a')
    disp[Symbol.dispose]()
    await wait(60)

    expect(writes).toBe(0)
    dropRoot(root)
  })
})

describe('real-DomScheduler mount parity', () => {
  const buildTree = (): I$Node =>
    $element('section')(
      style({ display: 'flex' }),
      attr({ 'data-kind': 'parity' }),
      styleBehavior(constantState<IStyleCSS>({ opacity: '0.5' }))
    )(
      $element('span')(styleInline(constantState<IStyleCSS>({ color: 'red' })))($text('left')),
      $text(constantState('mid')),
      $element('em')($text('right'))
    )

  test('async mount settles to the same DOM as the sync scheduler', async () => {
    const syncRoot = freshRoot()
    const syncDisp = render({ rootAttachment: syncRoot, $rootNode: buildTree(), scheduler: syncScheduler })
    const expected = syncRoot.innerHTML
    expect(expected).toContain('parity')

    const asyncRoot = freshRoot()
    const asyncDisp = render({ rootAttachment: asyncRoot, $rootNode: buildTree(), scheduler: createDomScheduler() })
    await wait(150)

    expect(asyncRoot.innerHTML).toBe(expected)
    syncDisp[Symbol.dispose]()
    asyncDisp[Symbol.dispose]()
    dropRoot(syncRoot)
    dropRoot(asyncRoot)
  })
})

describe('attr patch semantics (F5)', () => {
  test('two attr patches in the same frame both land', async () => {
    const scheduler = createDomScheduler()
    const root = freshRoot()
    const { source, next } = pushStream<Record<string, string>>()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(attrBehavior(source))(),
      scheduler
    })
    await wait(60)

    next({ 'data-a': '1' })
    next({ 'data-b': '2' })
    await wait(60)

    const el = root.querySelector('div') as HTMLElement
    expect(el.getAttribute('data-a')).toBe('1')
    expect(el.getAttribute('data-b')).toBe('2')
    disp[Symbol.dispose]()
    dropRoot(root)
  })
})

describe('decorator demotion is per-emission-copy (F4)', () => {
  test('a decorator after a stream op does not accumulate subscriptions across mounts', () => {
    let subs = 0
    const styleSrc: IStream<IStyleCSS | null> = {
      run() {
        subs++
        return disposeWith(() => {})
      }
    }
    const passthrough = (src: I$Node) => src
    const $decorated = $element('div')(passthrough, styleBehavior(styleSrc))($text('x'))

    for (let i = 0; i < 3; i++) {
      const root = freshRoot()
      const disp = render({ rootAttachment: root, $rootNode: $decorated, scheduler: syncScheduler })
      disp[Symbol.dispose]()
      dropRoot(root)
    }

    expect(subs).toBe(3)
  })
})

describe('$text disposal channel (F3)', () => {
  test('switchLatest over $text inners replaces instead of accumulating', () => {
    const root = freshRoot()
    const { source, next } = subject(true)
    const $view = $element('div')(switchLatest(map(on => (on ? $text('ON') : $text('OFF')), source)))
    const disp = render({ rootAttachment: root, $rootNode: $view, scheduler: syncScheduler })

    const el = root.querySelector('div') as HTMLElement
    expect(el.textContent).toBe('ON')

    next(false)
    expect(el.textContent).toBe('OFF')

    next(true)
    expect(el.textContent).toBe('ON')

    disp[Symbol.dispose]()
    expect(root.childNodes.length).toBe(0)
    dropRoot(root)
  })
})

describe('double-mount reporting (F2)', () => {
  test('one manifest value reaching several slots reports through onError once per manifest', () => {
    const root = freshRoot()
    const errors: unknown[] = []
    // state() replays the cached (already-mounted) INode to the later slots —
    // the double-mount class of F2. (Bare multicast under the sync scheduler
    // emits before the second subscriber joins, so it does not reproduce.)
    const $card = state()($element('div')($text('x'))) as I$Node
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('section')($card, $card, $card),
      scheduler: syncScheduler,
      onError: e => errors.push(e)
    })

    // two set() failures, deduped to a single report for the shared manifest
    expect(errors).toHaveLength(1)
    expect(String(errors[0])).toContain('already set')
    disp[Symbol.dispose]()
    dropRoot(root)
  })
})

describe('MountPort (step 7)', () => {
  test('onElement fires immediately when already resolved, once when pending, and resolve is once-only', () => {
    const port = new MountPort<string>()
    const seen: string[] = []

    const sub = port.onElement(el => seen.push(`pending:${el}`))
    expect(seen).toEqual([])

    port.resolve('a')
    expect(seen).toEqual(['pending:a'])
    expect(port.element()).toBe('a')

    port.resolve('b')
    expect(port.element()).toBe('a')

    port.onElement(el => seen.push(`late:${el}`))
    expect(seen).toEqual(['pending:a', 'late:a'])
    sub[Symbol.dispose]()
  })

  test('a deregistered callback does not fire', () => {
    const port = new MountPort<number>()
    let fired = 0
    const sub = port.onElement(() => fired++)
    sub[Symbol.dispose]()
    port.resolve(1)
    expect(fired).toBe(0)
  })

  test('a callback disposing itself during resolve does not skip its siblings', () => {
    const port = new MountPort<number>()
    const fired: string[] = []
    const first = port.onElement(() => {
      fired.push('first')
      first[Symbol.dispose]()
    })
    port.onElement(() => fired.push('second'))
    port.onElement(() => fired.push('third'))
    port.resolve(1)
    expect(fired).toEqual(['first', 'second', 'third'])
  })
})

describe('nodeEvent on unmounted manifests', () => {
  test('a directly-subscribed $wrapNativeElement stream still attaches via the pre-set native', () => {
    const el = document.createElement('button')
    const clicks: unknown[] = []
    const $btn = $wrapNativeElement(el)()

    const sub = (nodeEvent('click', $btn as never) as IStream<unknown>).run(
      { event: (_t, ev) => clicks.push(ev), error() {}, end() {} },
      syncScheduler
    )

    el.dispatchEvent(new (globalThis as any).window.Event('click', { bubbles: true }))
    expect(clicks).toHaveLength(1)
    sub[Symbol.dispose]()
  })
})

describe('component.ports (step 8)', () => {
  test('record-based ports flow events out through tethers', () => {
    const root = freshRoot()
    const clicks: unknown[] = []

    const $Btn = component.ports({ click: port<PointerEvent>() }, (b: { click: IBehavior<PointerEvent> }) => {
      const [click, clickTether] = b.click
      return [$element('button')(clickTether(nodeEvent('click')))($text('go')), { click }]
    })

    const [out, outTether] = behavior<unknown>()
    const consume = out.run({ event: (_t: number, v: unknown) => clicks.push(v), error() {}, end() {} }, syncScheduler)
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')($Btn({ click: outTether() })),
      scheduler: syncScheduler
    })

    const btn = root.querySelector('button') as HTMLElement
    btn.dispatchEvent(new (globalThis as any).window.Event('click', { bubbles: true }))
    expect(clicks).toHaveLength(1)

    consume[Symbol.dispose]()
    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('a tether key with no matching output reports instead of throwing mid-mount', () => {
    const root = freshRoot()
    const errors: unknown[] = []

    const $Child = component(([sel]: IBehavior<number>[]) => [
      $element('span')($text('child')),
      { select: (sel as never as [unknown])[0] }
    ])

    const [, badTether] = behavior<number>()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')($Child({ selct: badTether() } as never)),
      scheduler: syncScheduler,
      onError: e => errors.push(e)
    })

    // the typo is reported, the view still mounts
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(String(errors[0])).toContain("'selct'")
    expect(root.querySelector('span')?.textContent).toBe('child')
    disp[Symbol.dispose]()
    dropRoot(root)
  })
})

describe('static fast path (step 9)', () => {
  test('op-free compose results are branded; op-wrapped are not', () => {
    const branded = $element('div')(style({ color: 'red' }))($text('x')) as unknown as Record<symbol, unknown>
    expect(branded[NODE_BRAND]).toBeDefined()

    const passthrough = (src: I$Node) => src
    const unbranded = $element('div')(passthrough)($text('x')) as unknown as Record<symbol, unknown>
    expect(unbranded[NODE_BRAND]).toBeUndefined()

    const staticText = $text('hi') as unknown as Record<symbol, unknown>
    expect(staticText[TEXT_BRAND]).toBe('hi')
    const dynamicText = $text(constantState('hi')) as unknown as Record<symbol, unknown>
    expect(dynamicText[TEXT_BRAND]).toBeUndefined()
  })

  test('a branded subtree mounts inline and tears down through the same slot bookkeeping', () => {
    const root = freshRoot()
    const $view = $element('section')(
      $element('div')(style({ display: 'flex' }))($text('a'), $element('b')($text('deep')))
    )
    const disp = render({ rootAttachment: root, $rootNode: $view, scheduler: syncScheduler })

    expect(root.querySelector('section > div > b')?.textContent).toBe('deep')
    disp[Symbol.dispose]()
    expect(root.childNodes.length).toBe(0)
    dropRoot(root)
  })
})

describe('committer + devtool (step 10)', () => {
  test('one bad apply in a frame batch does not starve sibling bindings', async () => {
    const scheduler = createDomScheduler()
    const root = freshRoot()
    const errors: unknown[] = []
    const bad = pushStream<string>()
    const good = pushStream<string>()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(effectProp('badProp', bad.source), effectProp('goodProp', good.source))(),
      scheduler,
      onError: e => errors.push(e)
    })
    await wait(60)

    const el = root.querySelector('div') as HTMLElement & { badProp?: string; goodProp?: string }
    Object.defineProperty(el, 'badProp', {
      set() {
        throw new Error('bad setter')
      },
      configurable: true
    })

    bad.next('x')
    good.next('y')
    await wait(60)

    expect(errors).toHaveLength(1)
    expect((el as any).goodProp).toBe('y')

    // the failed binding is not frozen: fix the target, next value applies
    Object.defineProperty(el, 'badProp', { value: undefined, writable: true, configurable: true })
    bad.next('recovered')
    await wait(60)
    expect((el as any).badProp).toBe('recovered')

    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('devtool exposes the commit journal and binding registry', async () => {
    const scheduler = createDomScheduler()
    const root = freshRoot()
    const styleSrc = pushStream<IStyleCSS>()
    const textSrc = pushStream<string>()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(styleInline(styleSrc.source as IStream<IStyleCSS | null>))($text(textSrc.source)),
      scheduler,
      devtool: true
    })
    await wait(60)

    styleSrc.next({ color: 'red' })
    styleSrc.next({ color: 'blue' })
    textSrc.next('hello')
    await wait(60)

    const devtool = disp.devtool
    expect(devtool).toBeDefined()
    const journal = devtool?.journal() ?? []
    // two bindings dirtied → two commits (style coalesced to latest)
    expect(journal).toHaveLength(2)
    expect(journal.map(j => j.channel).sort()).toEqual(['styleInline', 'text'])
    expect(journal.find(j => j.channel === 'styleInline')?.value).toContain('blue')

    const bindings = devtool?.bindings()
    expect(bindings?.total).toBe(2)
    expect(bindings?.live).toBe(2)

    disp[Symbol.dispose]()
    // disposed bindings deregister — the live registry must not pin them
    const after = devtool?.bindings()
    expect(after?.live).toBe(0)
    expect(after?.total).toBe(2)
    dropRoot(root)
  })

  test('a user paint task and binding writes land in the same frame', async () => {
    const scheduler = createDomScheduler()
    const root = freshRoot()
    const src = pushStream<string>()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(effectProp('p', src.source))(),
      scheduler
    })
    await wait(60)

    const el = root.querySelector('div') as HTMLElement & { p?: string }
    let userTaskRan = false
    src.next('v')
    scheduler.paint(
      mkTask(() => {
        userTaskRan = true
      })
    )
    await wait(60)

    expect(el.p).toBe('v')
    expect(userTaskRan).toBe(true)
    disp[Symbol.dispose]()
    dropRoot(root)
  })
})

describe('re-entrant teardown (discard scoping)', () => {
  test('an unrelated subtree swapped during another teardown cascade still detaches its old DOM', () => {
    const root = freshRoot()
    const { source: aSrc, next: aNext } = subject(true)
    const { source: bSrc, next: bNext } = subject(true)

    // Unmounting A runs a cleanup that synchronously swaps B's inner view —
    // B's old entry disposes while A's discard cascade is in flight and must
    // still remove its own element (it is not a descendant of A).
    const $a = $element('div')(
      attr({ id: 'a' }),
      effectRun(() => disposeWith(() => bNext(false)))
    )($text('a'))
    const $b = $element('div')(attr({ id: 'b' }))(
      switchLatest(map(on => (on ? $element('b')($text('x')) : $element('i')($text('y'))), bSrc))
    )
    const $view = $element('section')(switchLatest(map(on => (on ? $a : $element('span')($text('-'))), aSrc)), $b)

    const disp = render({ rootAttachment: root, $rootNode: $view, scheduler: syncScheduler })
    const b = root.querySelector('#b') as HTMLElement
    expect(b.textContent).toBe('x')

    aNext(false)

    expect(b.children.length).toBe(1)
    expect(b.children[0].tagName.toLowerCase()).toBe('i')
    expect(b.textContent).toBe('y')

    disp[Symbol.dispose]()
    dropRoot(root)
  })
})

describe('slot multi-emission semantics (pin)', () => {
  test('one segment receiving multiple node emissions appends; null unmounts all', () => {
    const root = freshRoot()
    const { source: killSource, next: kill } = pushStream<null>()
    const $a = $element('b')($text('a'))
    const $b = $element('i')($text('b'))
    const slot = merge($a, $b, killSource) as I$Slottable
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(slot),
      scheduler: syncScheduler
    })

    const el = root.querySelector('div') as HTMLElement
    expect(el.children.length).toBe(2)
    expect(el.children[0].tagName.toLowerCase()).toBe('b')
    expect(el.children[1].tagName.toLowerCase()).toBe('i')

    kill(null)
    expect(el.children.length).toBe(0)

    disp[Symbol.dispose]()
    dropRoot(root)
  })
})
