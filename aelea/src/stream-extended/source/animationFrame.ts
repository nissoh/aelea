import type { IStream } from '../../stream/index.js'
import { fromCallback } from './fromCallback.js'

export const animationFrame = (): IStream<DOMHighResTimeStamp> =>
  fromCallback<DOMHighResTimeStamp>(cb => {
    if (typeof requestAnimationFrame === 'undefined') return () => {}
    let cancelled = false
    let id = requestAnimationFrame(function tick(t) {
      if (cancelled) return
      cb(t)
      if (cancelled) return
      id = requestAnimationFrame(tick)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  })
