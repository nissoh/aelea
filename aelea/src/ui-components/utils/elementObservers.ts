import { constant, continueWith, filter, type IStream, switchLatest, until } from '@/stream'
import { fromEventTarget } from '@/ui-renderer-dom'

const documentVisibilityChange = fromEventTarget(document, 'visibilitychange')
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

export const observer = {
  documentVisibilityChange,
  duringWindowActivity
}
