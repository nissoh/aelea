// Reactive style application throughput — exercises makeReactiveStyleApplier's
// per-emit diff. Two shapes: an "animation" (one element, many frames, same key
// set with changing values) and "single-emit" (mount a node whose styleBehavior
// fires once — the common case where the diff machinery is pure overhead).
//
// Run:    bun run benchmark/suites/reactive-style.ts

import { disposeWith, type IStream } from '../../src/stream/index.js'
import { state } from '../../src/stream-extended/index.js'
import { $element, type IStyleCSS, render, styleBehavior } from '../../src/ui/index.js'
import { dropRoot, freshRoot, installDom, syncScheduler } from '../lib/dom-env.js'
import { type IBenchTask, type ISuite, runAndPrint } from '../lib/suite.js'

installDom()
const doc = (globalThis as any).document as Document

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

// ---- animation: one element, FRAMES updates of a multi-key style ----
const FRAMES = 200

function vanillaAnimate() {
  const root = freshRoot()
  const el = doc.createElement('div')
  root.appendChild(el)
  for (let f = 0; f < FRAMES; f++) {
    el.style.setProperty('transform', `translateX(${f}px)`)
    el.style.setProperty('opacity', `${(f % 100) / 100}`)
    el.style.setProperty('color', f % 2 ? 'red' : 'blue')
  }
  dropRoot(root)
}

function aeleaAnimate() {
  const subj = subject<IStyleCSS>({ transform: 'translateX(0px)', opacity: '0', color: 'blue' })
  const $n = $element('div')(styleBehavior(subj.source))()
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $n, scheduler: syncScheduler })
  for (let f = 0; f < FRAMES; f++) {
    subj.next({ transform: `translateX(${f}px)`, opacity: `${(f % 100) / 100}`, color: f % 2 ? 'red' : 'blue' })
  }
  disp[Symbol.dispose]()
  dropRoot(root)
}

// ---- animation but the SAME object reference is re-emitted every frame ----
// (e.g. a state replay): the applier should be able to short-circuit entirely.
function aeleaAnimateSameRef() {
  const fixed: IStyleCSS = { transform: 'translateX(10px)', opacity: '0.5', color: 'red' }
  const subj = subject<IStyleCSS>(fixed)
  const $n = $element('div')(styleBehavior(subj.source))()
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $n, scheduler: syncScheduler })
  for (let f = 0; f < FRAMES; f++) subj.next(fixed)
  disp[Symbol.dispose]()
  dropRoot(root)
}

// ---- single-emit: mount N nodes whose styleBehavior fires exactly once ----
const NODES = 200

function aeleaSingleEmit() {
  const $tree = $element('div')(
    ...Array.from({ length: NODES }, (_, i) =>
      $element('div')(styleBehavior(state({ color: i % 2 ? 'red' : 'blue', padding: '4px' } as IStyleCSS, never())))()
    )
  )
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $tree, scheduler: syncScheduler })
  disp[Symbol.dispose]()
  dropRoot(root)
}

function never<T>(): IStream<T> {
  return { run: () => disposeWith(() => {}) }
}

function vanillaSingleEmit() {
  const root = freshRoot()
  const wrap = doc.createElement('div')
  for (let i = 0; i < NODES; i++) {
    const d = doc.createElement('div')
    d.style.setProperty('color', i % 2 ? 'red' : 'blue')
    d.style.setProperty('padding', '4px')
    wrap.appendChild(d)
  }
  root.appendChild(wrap)
  dropRoot(root)
}

const tasks: IBenchTask[] = [
  { group: `animation (${FRAMES} frames, fresh objects)`, variant: 'vanilla DOM', baseline: true, fn: vanillaAnimate },
  { group: `animation (${FRAMES} frames, fresh objects)`, variant: '@aelea', fn: aeleaAnimate },
  { group: `animation (${FRAMES} frames, same ref)`, variant: 'vanilla DOM', baseline: true, fn: vanillaAnimate },
  { group: `animation (${FRAMES} frames, same ref)`, variant: '@aelea', fn: aeleaAnimateSameRef },
  { group: `single-emit styleBehavior (${NODES})`, variant: 'vanilla DOM', baseline: true, fn: vanillaSingleEmit },
  { group: `single-emit styleBehavior (${NODES})`, variant: '@aelea', fn: aeleaSingleEmit }
]

const suite: ISuite = {
  title: 'reactive-style',
  subtitle: 'styleBehavior diff throughput; happy-dom + sync scheduler',
  options: { time: 500, warmupTime: 250 },
  tasks
}

export default suite

if (import.meta.main) await runAndPrint(suite)
