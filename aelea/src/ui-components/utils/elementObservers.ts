import {
  constant,
  continueWith,
  filter,
  type IStream,
  never,
  switchLatest,
  switchMap,
  until
} from '../../stream/index.js'
import { fromCallback, stream } from '../../stream-extended/index.js'
import { type ISlottable, onMounted } from '../../ui/index.js'
import { fromEventTarget } from '../../ui-renderer-dom/event.js'

const documentVisibilityChange: IStream<Event> = stream((sink, scheduler) =>
  fromEventTarget(document, 'visibilitychange').run(sink, scheduler)
)
const documentVisible = filter(() => document.visibilityState === 'visible', documentVisibilityChange)
const documentHidden = filter(() => document.visibilityState === 'hidden', documentVisibilityChange)

export const duringWindowActivity = <T>(source: IStream<T>) => {
  const sourceUntilInactivity = until(documentHidden, source)
  const activity = continueWith(
    (): IStream<T> => switchLatest(constant(activity, documentVisible)),
    sourceUntilInactivity
  )
  return activity
}

const observeElement =
  <T>(observe: (element: Element) => IStream<T>) =>
  (source: IStream<ISlottable>): IStream<T> =>
    switchMap(
      slottable =>
        slottable.kind === 'node'
          ? switchMap(el => (el instanceof Element ? observe(el) : never), onMounted(slottable.mount))
          : never,
      source
    )

export const intersection = (config: IntersectionObserverInit = {}) =>
  observeElement(target =>
    fromCallback<IntersectionObserverEntry[], [IntersectionObserverEntry[]]>(
      cb => {
        if (typeof IntersectionObserver === 'undefined') return () => {}
        const io = new IntersectionObserver(cb, config)
        io.observe(target)
        return () => io.disconnect()
      },
      entries => entries
    )
  )

export const resize = (config: ResizeObserverOptions = {}) =>
  observeElement(target =>
    fromCallback<ResizeObserverEntry[], [ResizeObserverEntry[]]>(
      cb => {
        if (typeof ResizeObserver === 'undefined') return () => {}
        const ro = new ResizeObserver(cb)
        ro.observe(target, config)
        return () => ro.disconnect()
      },
      entries => entries
    )
  )

export const observer = {
  documentVisibilityChange,
  duringWindowActivity,
  intersection,
  resize
}
