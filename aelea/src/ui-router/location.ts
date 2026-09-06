import { type IStream, map, merge, start, tap } from '../stream/index.js'
import { multicast, stream } from '../stream-extended/index.js'
import { fromEventTarget } from '../ui-renderer-dom/event.js'
import type { PathEvent } from './types.js'

const broadcaster = new EventTarget()
const PROGRAMMATIC = 'change' as const

/**
 * Stream of location changes. Replays the current `document.location` once
 * on subscribe (so the router synchronizes immediately), then re-emits on
 * browser back/forward (popstate) and after `pushUrl` / `replaceUrl`. The
 * globals are read at subscription, so the module loads outside a browser.
 */
export const locationChange: IStream<Location> = multicast(
  stream((sink, scheduler) =>
    start(
      document.location,
      map(
        () => document.location,
        merge(fromEventTarget(window, 'popstate'), fromEventTarget(broadcaster, PROGRAMMATIC))
      )
    ).run(sink, scheduler)
  )
)

const currentUrl = (): string => location.pathname + location.search + location.hash

/**
 * Programmatically navigate to a path-relative URL like `/p/guide?x=1#sec`.
 * Pushes a history entry and notifies the router. No-op when the target
 * equals the current URL (avoids a redundant entry).
 */
export const pushUrl = (url: string): void => {
  if (currentUrl() === url) return
  history.pushState(null, '', url)
  broadcaster.dispatchEvent(new Event(PROGRAMMATIC))
}

/**
 * Like `pushUrl` but replaces the current history entry instead of pushing
 * a new one.
 */
export const replaceUrl = (url: string): void => {
  if (currentUrl() === url) return
  history.replaceState(null, '', url)
  broadcaster.dispatchEvent(new Event(PROGRAMMATIC))
}

/**
 * Build a `PathEvent` stream rooted at `baseRoute` (the synthetic name for
 * the path under `document.baseURI`). Strips query and hash; route fragments
 * only see the pathname.
 */
export const fragmentsFromLocation = (baseRoute: string): IStream<PathEvent> =>
  map(() => {
    const trailing = /\/$/
    const basePath = new URL(document.baseURI).pathname.replace(trailing, '')
    const pathname = location.pathname.replace(trailing, '')
    const rel = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname
    if (rel === '' || rel === '/') return [baseRoute]
    const frags = rel.split('/')
    frags[0] = baseRoute
    return frags
  }, locationChange)

/**
 * Stream op that writes `document.title = title` whenever the wrapped
 * stream emits. Compose inside a `match()` / `contains()` gate so the title
 * commits when the matched subtree mounts:
 *
 *     match(guideRoute)(commitTitle('Guide')($Guide()))
 */
export const commitTitle =
  (title: string) =>
  <T>(node: IStream<T>): IStream<T> =>
    tap(() => {
      document.title = title
    }, node)
