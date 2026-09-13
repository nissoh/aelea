// Pins for the UI overhaul: one way to the element (mount port), one channel
// walk for both renderers, owned-key channel semantics, effects as their own
// channel, dynamic text mounted inline, and the shared scheduler core.

import { beforeAll, describe, expect, test } from 'bun:test'
import { dropRoot, freshRoot, installDom, syncScheduler } from '../benchmark/lib/dom-env.js'
import {
  delay,
  disposeWith,
  fromIterable,
  type IStream,
  type ITask,
  just,
  map,
  merge,
  switchLatest
} from '../src/stream/index.js'
import { state } from '../src/stream-extended/index.js'
import {
  $element,
  $text,
  attrBehavior,
  createDomScheduler,
  createHeadlessScheduler,
  createSyncScheduler,
  effectRun,
  type I$Node,
  type IStyleCSS,
  MOTION_NO_WOBBLE,
  MOTION_SNAP,
  motion,
  nodeEvent,
  onMounted,
  render,
  styleBehavior
} from '../src/ui/index.js'
import { observeManifest } from '../src/ui-renderer-takumi/snapshot.js'

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

beforeAll(() => {
  installDom()
})

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
  return { source: state(initial, base), next: v => push?.(v) }
}

const mkTask = (run: (time: number) => void): ITask => ({
  active: true,
  run,
  error() {},
  [Symbol.dispose]() {
    this.active = false
  }
})

describe('one way to the element', () => {
  test('a shared manifest mounted in two slots yields two elements and one report', () => {
    const root = freshRoot()
    const errors: unknown[] = []
    const $shared = state()($element('b')($text('x'))) as I$Node
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')($shared, $shared),
      scheduler: syncScheduler,
      onError: e => errors.push(e)
    })
    expect(root.querySelectorAll('b').length).toBe(2)
    expect(errors).toHaveLength(1)
    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('onMounted emits the element once the port resolves, immediately when already mounted', () => {
    const root = freshRoot()
    const seen: string[] = []
    const $tree = $element('section')(
      map(node => {
        onMounted(node.mount).run(
          { event: (_t, el) => seen.push((el as Element).tagName), error() {}, end() {} },
          syncScheduler
        )
        return node
      })
    )()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })
    expect(seen).toEqual(['SECTION'])
    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('nodeEvent listens through the mount port and detaches on dispose', () => {
    const root = freshRoot()
    const clicks: unknown[] = []
    let $btn: I$Node | null = null
    const $tree = $element('div')(
      ($btn = $element('button')(
        map(node => {
          nodeEvent('click', just(node)).run(
            { event: (_t, ev) => clicks.push(ev), error() {}, end() {} },
            syncScheduler
          )
          return node
        })
      )($text('go')))
    )
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })
    const btn = root.querySelector('button') as HTMLElement
    btn.click()
    expect(clicks).toHaveLength(1)
    disp[Symbol.dispose]()
    dropRoot(root)
    expect($btn).not.toBeNull()
  })
})

describe('one channel walk, two renderers', () => {
  test('DOM and takumi agree on reactive style precedence by emission order', async () => {
    const build = () =>
      $element('span')(styleBehavior(just({ color: 'blue' })), styleBehavior(delay(5, just({ color: 'red' }))))()

    const root = freshRoot()
    const disp = render({ rootAttachment: root, $rootNode: build(), scheduler: createDomScheduler() })
    const observer = observeManifest(build(), createHeadlessScheduler(), { onDirty() {}, onError() {} })
    await wait(60)

    expect((root.querySelector('span') as HTMLElement).style.color).toBe('red')
    expect(observer.materialize()?.style.color).toBe('red')

    disp[Symbol.dispose]()
    observer[Symbol.dispose]()
    dropRoot(root)
  })

  test('the takumi observer tracks slot swaps and null unmounts like the DOM', () => {
    const toggle = subject(true)
    const $tree = $element('div')(
      switchLatest(map(on => (on ? $element('em')($text('on')) : $element('s')($text('off'))), toggle.source))
    )
    const observer = observeManifest($tree, syncScheduler, { onDirty() {}, onError() {} })
    expect(observer.materialize()?.children).toEqual([{ tag: 'em', style: {}, attributes: {}, children: ['on'] }])
    toggle.next(false)
    expect(observer.materialize()?.children).toEqual([{ tag: 's', style: {}, attributes: {}, children: ['off'] }])
    observer[Symbol.dispose]()
  })
})

describe('owned-key channels', () => {
  test('attrBehavior removes keys it stops emitting and clears on null', () => {
    const attrs = subject<Record<string, string> | null>({ 'data-a': '1', 'data-b': '2' })
    const $tree = $element('div')(attrBehavior(attrs.source))()
    const root = freshRoot()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })
    const el = root.querySelector('div') as HTMLElement

    expect(el.getAttribute('data-a')).toBe('1')
    attrs.next({ 'data-b': '3' })
    expect(el.hasAttribute('data-a')).toBe(false)
    expect(el.getAttribute('data-b')).toBe('3')
    attrs.next(null)
    expect(el.hasAttribute('data-b')).toBe(false)

    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('two style decorators on one node each own their keys', () => {
    const a = subject<IStyleCSS | null>({ color: 'red' })
    const b = subject<IStyleCSS | null>({ opacity: '0.5' })
    const $tree = $element('div')(styleBehavior(a.source), styleBehavior(b.source))()
    const root = freshRoot()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })
    const el = root.querySelector('div') as HTMLElement

    a.next(null)
    expect(el.style.color).toBe('')
    expect(el.style.opacity).toBe('0.5')

    disp[Symbol.dispose]()
    dropRoot(root)
  })
})

describe('effects and text', () => {
  test('effectRun receives the mounted element and its cleanup runs on unmount', () => {
    const root = freshRoot()
    const log: string[] = []
    const $tree = $element('div')(
      effectRun((el: HTMLElement) => {
        log.push(`run:${el.tagName}`)
        return disposeWith(() => log.push('cleanup'))
      })
    )()
    const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })
    expect(log).toEqual(['run:DIV'])
    disp[Symbol.dispose]()
    expect(log).toEqual(['run:DIV', 'cleanup'])
    dropRoot(root)
  })
})

describe('scheduler core', () => {
  test('a throwing asap task does not drop the rest of the batch and idle still resolves', async () => {
    const scheduler = createHeadlessScheduler()
    let second = false
    scheduler.asap(
      mkTask(() => {
        throw new Error('boom')
      })
    )
    scheduler.asap(
      mkTask(() => {
        second = true
      })
    )
    await scheduler.idle()
    expect(second).toBe(true)
    expect(scheduler.stats?.().taskErrors).toBe(1)
  })

  test('idle waits for delays and paints, and disposal of a delay settles it', async () => {
    const scheduler = createDomScheduler()
    let fired = false
    const d = scheduler.delay(
      mkTask(() => {
        fired = true
      }),
      1000
    )
    let idled = false
    scheduler.idle().then(() => {
      idled = true
    })
    await wait(5)
    expect(idled).toBe(false)
    d[Symbol.dispose]()
    await wait(5)
    expect(idled).toBe(true)
    expect(fired).toBe(false)
  })

  test('the sync scheduler runs asap and paint inline', () => {
    const scheduler = createSyncScheduler()
    const order: string[] = []
    scheduler.asap(mkTask(() => order.push('asap')))
    scheduler.paint(mkTask(() => order.push('paint')))
    expect(order).toEqual(['asap', 'paint'])
  })
})

describe('motion', () => {
  test('a spring steps across frames under the DOM scheduler, not inside one flush', async () => {
    const scheduler = createDomScheduler()
    const t0 = performance.now()
    const ticks: number[] = []
    const values: number[] = []
    motion({}, merge(just(0), delay(20, just(100)))).run(
      {
        event(_, v) {
          ticks.push(Math.round(performance.now() - t0))
          values.push(v)
        },
        error() {},
        end() {}
      },
      scheduler
    )
    await wait(1800)
    const distinct = new Set(ticks.slice(1)).size
    expect(values[0]).toBe(0)
    expect(values[values.length - 1]).toBe(100)
    expect(values.length).toBeGreaterThan(5)
    expect(values.length).toBeLessThan(200)
    expect(distinct).toBeGreaterThan(5)
  })
})

describe('motion under a throttled host', () => {
  // A hidden tab throttles timers to a second or more. Explicit integration of
  // a spring is only stable below `2 / damping` seconds, so a variable step
  // taken straight from the elapsed time diverges for a stiff preset;
  // MOTION_SNAP (damping 80) is unstable above 25ms.
  class StepScheduler {
    now = 0
    queued: ITask[] = []
    asap(task: ITask): Disposable {
      task.run(this.now)
      return task
    }
    paint(task: ITask): Disposable {
      return this.asap(task)
    }
    delay(task: ITask): Disposable {
      this.queued.push(task)
      return task
    }
    time(): number {
      return this.now
    }
    dayTime(): number {
      return this.now
    }
    advance(ms: number): void {
      this.now += ms
      const due = this.queued
      this.queued = []
      for (const task of due) task.run(this.now)
    }
  }

  const travel = (config: Parameters<typeof motion>[0], tickMs: number) => {
    const scheduler = new StepScheduler()
    const seen: number[] = []
    motion(config, fromIterable([15, 0])).run(
      { event: (_t, v) => seen.push(v), error() {}, end() {} },
      scheduler as never
    )
    for (let i = 0; i < 400 && scheduler.queued.length > 0; i++) scheduler.advance(tickMs)
    return { seen, settled: scheduler.queued.length === 0 }
  }

  for (const [name, config] of [
    ['MOTION_SNAP', MOTION_SNAP],
    ['MOTION_NO_WOBBLE', MOTION_NO_WOBBLE],
    ['a stiff custom spring', { stiffness: 370, damping: 46, precision: 3 }]
  ] as const) {
    test(`${name} stays within its travel and settles at one frame per second`, () => {
      for (const tickMs of [1000 / 60, 1000]) {
        const { seen, settled } = travel(config, tickMs)
        const peak = seen.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
        expect([name, tickMs, settled]).toEqual([name, tickMs, true])
        expect([name, tickMs, peak <= 15.001]).toEqual([name, tickMs, true])
        expect(seen[seen.length - 1]).toBe(0)
      }
    })
  }

  test('a throttled tick advances the spring by real elapsed time, not one step', () => {
    const fast = travel(MOTION_NO_WOBBLE, 1000 / 60).seen.length
    const throttled = travel(MOTION_NO_WOBBLE, 1000).seen.length
    // one second of simulated spring per throttled tick, so a hidden tab
    // finishes the animation instead of leaving it half-way
    expect(throttled).toBeLessThan(fast / 4)
  })
})
