import { type Args, disposeWith, type IScheduler, type ISink, type ITask } from 'aelea/stream'

/**
 * Browser scheduler implementation using requestAnimationFrame for immediate scheduling
 * and setTimeout for delayed scheduling
 */
export const browserScheduler: IScheduler = {
  delay<T, TArgs extends Args>(sink: ISink<T>, task: ITask<T, TArgs>, delay: number, ...args: TArgs): Disposable {
    const timeoutId = setTimeout(task, delay, sink, ...args)
    return disposeWith(() => clearTimeout(timeoutId))
  },

  // asap<TArgs extends Args, T>(sink: any, callback: (sink: any, ...args: TArgs) => void, ...args: TArgs) {
  //   let disposed = false

  //   queueMicrotask(() => {
  //     if (!disposed) {
  //       callback(sink, ...args)
  //     }
  //   })

  //   return disposeWith(() => {
  //     disposed = true
  //   })
  // },
  asap<T, TArgs extends Args>(sink: ISink<T>, callback: ITask<T, TArgs>, ...args: TArgs): Disposable {
    let cancelled = false
    const frameId = requestAnimationFrame(() => {
      if (!cancelled) callback(sink, ...args)
    })
    return disposeWith(() => {
      cancelled = true
      cancelAnimationFrame(frameId)
    })
  },

  time(): number {
    return performance.now()
  }
}
