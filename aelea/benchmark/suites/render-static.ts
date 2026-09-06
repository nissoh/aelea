import { fromIterable, joinMap, just, map, switchLatest } from '../../src/stream/index.js'
import { type IBehavior, state } from '../../src/stream-extended/index.js'
import { $element, $text, attrBehavior, component, nodeEvent, render, styleBehavior } from '../../src/ui/index.js'
import { dropRoot, freshRoot, installDom, syncScheduler } from '../lib/dom-env.js'
import { type IBenchTask, type ISuite, runAndPrint } from '../lib/suite.js'

installDom()

const doc = (globalThis as any).document as Document

function vanillaSpan(text: string): HTMLElement {
  const el = doc.createElement('span')
  el.appendChild(doc.createTextNode(text))
  return el
}

function vanillaSmall() {
  const root = freshRoot()
  const div = doc.createElement('div')
  div.appendChild(vanillaSpan('a'))
  div.appendChild(vanillaSpan('b'))
  div.appendChild(vanillaSpan('c'))
  root.appendChild(div)
  dropRoot(root)
}

const $small = $element('div')($element('span')($text('a')), $element('span')($text('b')), $element('span')($text('c')))

function aeleaSmall() {
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $small, scheduler: syncScheduler })
  disp[Symbol.dispose]()
  dropRoot(root)
}

const DEEP_LEVELS = 10

function vanillaDeep() {
  const root = freshRoot()
  let parent: HTMLElement = root
  for (let i = 0; i < DEEP_LEVELS; i++) {
    const child = doc.createElement('div')
    parent.appendChild(child)
    parent = child
  }
  parent.appendChild(doc.createTextNode('leaf'))
  dropRoot(root)
}

function buildDeep(level: number): ReturnType<typeof $element> | ReturnType<typeof $text> {
  if (level === 0) return $text('leaf') as any
  return $element('div')(buildDeep(level - 1) as any) as any
}

const $deep = buildDeep(DEEP_LEVELS) as ReturnType<typeof $element>

function aeleaDeep() {
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $deep as any, scheduler: syncScheduler })
  disp[Symbol.dispose]()
  dropRoot(root)
}

const LIST_SIZE = 100

function vanillaList() {
  const root = freshRoot()
  const ul = doc.createElement('ul')
  for (let i = 0; i < LIST_SIZE; i++) {
    const li = doc.createElement('li')
    li.appendChild(doc.createTextNode(`row ${i}`))
    ul.appendChild(li)
  }
  root.appendChild(ul)
  dropRoot(root)
}

const $list = $element('ul')(...Array.from({ length: LIST_SIZE }, (_, i) => $element('li')($text(`row ${i}`))))

function aeleaList() {
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $list, scheduler: syncScheduler })
  disp[Symbol.dispose]()
  dropRoot(root)
}

const LIST_LARGE = 1000

function vanillaListLarge() {
  const root = freshRoot()
  const ul = doc.createElement('ul')
  for (let i = 0; i < LIST_LARGE; i++) {
    const li = doc.createElement('li')
    li.appendChild(doc.createTextNode(`row ${i}`))
    ul.appendChild(li)
  }
  root.appendChild(ul)
  dropRoot(root)
}

const $listLarge = $element('ul')(...Array.from({ length: LIST_LARGE }, (_, i) => $element('li')($text(`row ${i}`))))

function aeleaListLarge() {
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $listLarge, scheduler: syncScheduler })
  disp[Symbol.dispose]()
  dropRoot(root)
}

// Reactive-node group: every node carries several reactive decorators
// (two styleBehavior layers, one attrBehavior, dynamic $text). Exercises the
// per-entry subscribe path (runEffect) and the dynamic-text prime, which the
// purely-static cases above never touch. Sources are `just(...)` (settled),
// so the @aelea side does equivalent final work to the vanilla baseline.
const REACTIVE_SIZE = 100

function vanillaReactive() {
  const root = freshRoot()
  const wrap = doc.createElement('div')
  for (let i = 0; i < REACTIVE_SIZE; i++) {
    const d = doc.createElement('div')
    d.style.setProperty('color', 'red')
    d.style.setProperty('opacity', '0.5')
    d.setAttribute('data-i', String(i))
    d.appendChild(doc.createTextNode(`row ${i}`))
    wrap.appendChild(d)
  }
  root.appendChild(wrap)
  dropRoot(root)
}

const $reactive = $element('div')(
  ...Array.from({ length: REACTIVE_SIZE }, (_, i) =>
    $element('div')(
      styleBehavior(just({ color: 'red' })),
      styleBehavior(just({ opacity: '0.5' })),
      attrBehavior(just({ 'data-i': String(i) }))
    )($text(just(`row ${i}`)))
  )
)

function aeleaReactive() {
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $reactive, scheduler: syncScheduler })
  disp[Symbol.dispose]()
  dropRoot(root)
}

// Dynamic-slot group: rows arrive through a stream (joinMap over an iterable)
// into ONE segment, so every row is a slot entry with its own disposable link;
// the swap group re-emits a switchLatest slot SWAPS times so each emission
// disposes the previous entry and inserts before its static sibling.
const DYNAMIC_SIZE = 100
const SWAPS = 100

const $dynamic = $element('ul')(
  joinMap(i => $element('li')($text(`row ${i}`)), fromIterable(Array.from({ length: DYNAMIC_SIZE }, (_, i) => i)))
)

function aeleaDynamic() {
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $dynamic, scheduler: syncScheduler })
  disp[Symbol.dispose]()
  dropRoot(root)
}

function vanillaSwaps() {
  const root = freshRoot()
  const host = doc.createElement('div')
  const tail = doc.createElement('hr')
  host.appendChild(tail)
  root.appendChild(host)
  let current: HTMLElement | null = null
  for (let i = 0; i < SWAPS; i++) {
    if (current) host.removeChild(current)
    current = doc.createElement(i % 2 ? 'em' : 's')
    current.appendChild(doc.createTextNode(i % 2 ? 'on' : 'off'))
    host.insertBefore(current, tail)
  }
  dropRoot(root)
}

function aeleaSwaps() {
  const root = freshRoot()
  let push: ((v: boolean) => void) | null = null
  const toggle = state(false, {
    run(sink, scheduler) {
      push = v => sink.event(scheduler.time(), v)
      return { [Symbol.dispose]() {} }
    }
  })
  const $host = $element('div')(
    switchLatest(map(on => (on ? $element('em')($text('on')) : $element('s')($text('off'))), toggle)),
    $element('hr')()
  )
  const disp = render({ rootAttachment: root, $rootNode: $host, scheduler: syncScheduler })
  for (let i = 1; i < SWAPS; i++) push?.(i % 2 === 1)
  disp[Symbol.dispose]()
  dropRoot(root)
}

// Component group: each row is a component with a click tether, so every row
// mounts through the dynamic node path (instance + port + tether wiring).
const COMPONENT_SIZE = 100

const $Row = (label: string) =>
  component(([click, clickTether]: IBehavior<PointerEvent>) => [
    $element('li')(clickTether(nodeEvent('click')))($text(label)),
    { click }
  ])

const $components = $element('ul')(...Array.from({ length: COMPONENT_SIZE }, (_, i) => $Row(`row ${i}`)({})))

function vanillaComponents() {
  const root = freshRoot()
  const ul = doc.createElement('ul')
  for (let i = 0; i < COMPONENT_SIZE; i++) {
    const li = doc.createElement('li')
    li.addEventListener('click', () => {})
    li.appendChild(doc.createTextNode(`row ${i}`))
    ul.appendChild(li)
  }
  root.appendChild(ul)
  dropRoot(root)
}

function aeleaComponents() {
  const root = freshRoot()
  const disp = render({ rootAttachment: root, $rootNode: $components, scheduler: syncScheduler })
  disp[Symbol.dispose]()
  dropRoot(root)
}

function pair(group: string, baselineFn: () => unknown, aeleaFn: () => unknown): IBenchTask[] {
  return [
    { group, variant: 'vanilla DOM', baseline: true, fn: baselineFn },
    { group, variant: '@aelea', fn: aeleaFn }
  ]
}

const tasks: IBenchTask[] = [
  ...pair('static tree (4 nodes)', vanillaSmall, aeleaSmall),
  ...pair(`deep tree (${DEEP_LEVELS} levels)`, vanillaDeep, aeleaDeep),
  ...pair(`flat list (${LIST_SIZE} rows)`, vanillaList, aeleaList),
  ...pair(`flat list (${LIST_LARGE} rows)`, vanillaListLarge, aeleaListLarge),
  ...pair(`reactive nodes (${REACTIVE_SIZE})`, vanillaReactive, aeleaReactive),
  ...pair(`dynamic list (${DYNAMIC_SIZE} rows, joinMap)`, vanillaList, aeleaDynamic),
  ...pair(`slot swaps (${SWAPS})`, vanillaSwaps, aeleaSwaps),
  ...pair(`component list (${COMPONENT_SIZE} tethers)`, vanillaComponents, aeleaComponents)
]

const suite: ISuite = {
  title: 'render-static',
  subtitle: 'mount + dispose roundtrip; happy-dom + sync scheduler',
  options: { time: 500, warmupTime: 250 },
  tasks
}

export default suite

if (import.meta.main) await runAndPrint(suite)
