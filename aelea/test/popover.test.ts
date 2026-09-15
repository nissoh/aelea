// $Popover exposes its open state as an output, replayed for late subscribers,
// so an anchor's owner can style it while the popover is up.

import { beforeAll, describe, expect, test } from 'bun:test'
import { dropRoot, freshRoot, installDom, syncScheduler } from '../benchmark/lib/dom-env.js'
import { disposeWith, type ISink, type IStream } from '../src/stream/index.js'
import { behavior, type IBehavior } from '../src/stream-extended/index.js'
import { $element, $text, attr, component, type I$Node, nodeEvent, render } from '../src/ui/index.js'
import { $Popover } from '../src/ui-components/index.js'

beforeAll(() => {
  installDom()
})

function pushStream<T>(): { source: IStream<T>; next: (v: T) => void } {
  let sink: ISink<T> | null = null
  return {
    source: {
      run(s, scheduler) {
        sink = s
        void scheduler
        return disposeWith(() => {
          sink = null
        })
      }
    },
    next: v => sink?.event(0, v)
  }
}

const observe = (source: IStream<boolean>) => {
  const seen: boolean[] = []
  const d = source.run({ event: (_t, v) => seen.push(v), error() {}, end() {} }, syncScheduler)
  return { seen, dispose: () => d[Symbol.dispose]() }
}

describe('$Popover open output', () => {
  test('emits false before any open, true on open, false on dismiss', () => {
    const opener = pushStream<I$Node>()
    const dismisser = pushStream<unknown>()
    const [open, openTether] = behavior<boolean>()
    const early = observe(open)

    const root = freshRoot()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(
        $Popover({ $open: opener.source, $target: $element('button')($text('anchor')), dismiss: dismisser.source })({
          open: openTether()
        })
      ),
      scheduler: syncScheduler,
      onError() {}
    })

    expect(early.seen).toEqual([false])
    opener.next($element('div')($text('body')))
    expect(early.seen).toEqual([false, true])
    dismisser.next(1)
    expect(early.seen).toEqual([false, true, false])

    early.dispose()
    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('a consumer subscribing while the popover is open sees true', () => {
    const opener = pushStream<I$Node>()
    const [open, openTether] = behavior<boolean>()
    const root = freshRoot()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(
        $Popover({ $open: opener.source, $target: $element('button')($text('anchor')) })({ open: openTether() })
      ),
      scheduler: syncScheduler,
      onError() {}
    })

    opener.next($element('div')($text('body')))
    const late = observe(open)
    expect(late.seen[late.seen.length - 1]).toBe(true)

    late.dispose()
    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('the output is opt-in: existing call sites that tether only dismiss are unaffected', () => {
    const opener = pushStream<I$Node>()
    const [dismissed, dismissTether] = behavior<unknown>()
    const got = observe(dismissed as IStream<boolean>)
    const root = freshRoot()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('div')(
        $Popover({ $open: opener.source, $target: $element('button')($text('anchor')) })({ dismiss: dismissTether() })
      ),
      scheduler: syncScheduler,
      onError() {}
    })
    opener.next($element('div')($text('body')))
    expect(root.querySelector('button')?.textContent).toBe('anchor')
    got.dispose()
    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('the anchor root carries aria-haspopup and a live aria-expanded; the container does not', () => {
    const opener = pushStream<I$Node>()
    const dismisser = pushStream<unknown>()
    const root = freshRoot()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('section')(
        $Popover({ $open: opener.source, $target: $element('button')($text('anchor')), dismiss: dismisser.source })({})
      ),
      scheduler: syncScheduler,
      onError() {}
    })
    const button = root.querySelector('button') as HTMLElement
    const container = button.parentElement as HTMLElement

    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    opener.next($element('div')($text('body')))
    expect(button.getAttribute('aria-expanded')).toBe('true')
    dismisser.next(1)
    expect(button.getAttribute('aria-expanded')).toBe('false')

    expect(container.tagName.toLowerCase()).not.toBe('button')
    expect(container.hasAttribute('aria-expanded')).toBe(false)
    expect(container.hasAttribute('aria-haspopup')).toBe(false)

    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('the decorated anchor still resolves its mount port, so anchor events and observers attach', () => {
    const opener = pushStream<I$Node>()
    const clicks: unknown[] = []
    const [click, clickTether] = behavior<MouseEvent>()
    const seen = click.run({ event: (_t, ev) => clicks.push(ev), error() {}, end() {} }, syncScheduler)
    const $Anchor = component(([anchorClick, anchorClickTether]: IBehavior<MouseEvent>) => [
      $element('button')(anchorClickTether(nodeEvent('click')))($text('anchor')),
      { click: anchorClick }
    ])
    const root = freshRoot()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('section')(
        $Popover({ $open: opener.source, $target: $Anchor({ click: clickTether() }) as I$Node })({})
      ),
      scheduler: syncScheduler,
      onError() {}
    })
    const button = root.querySelector('button') as HTMLElement
    button.click()
    expect(clicks).toHaveLength(1)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    seen[Symbol.dispose]()
    disp[Symbol.dispose]()
    dropRoot(root)
  })

  test('an anchor that declares its own aria-haspopup keeps it; the popover only supplies a default', () => {
    const opener = pushStream<I$Node>()
    const root = freshRoot()
    const disp = render({
      rootAttachment: root,
      $rootNode: $element('section')(
        $Popover({
          $open: opener.source,
          $target: $element('button')(attr({ 'aria-haspopup': 'menu' }))($text('menu'))
        })({})
      ),
      scheduler: syncScheduler,
      onError() {}
    })
    const button = root.querySelector('button') as HTMLElement
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    opener.next($element('div')($text('body')))
    expect(button.getAttribute('aria-expanded')).toBe('true')
    disp[Symbol.dispose]()
    dropRoot(root)
  })
})
