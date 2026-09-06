import { disposeAll, disposeBoth, type IScheduler, type ISink, type IStream } from '../../stream/index.js'
import { behavior, type IBehavior } from '../../stream-extended/index.js'
import type { I$Slottable, IComponentBehavior, IOutputTethers, ISlottable } from '../types.js'

type IComponentResult<T> = [I$Slottable, IComponentBehavior<T>] | [I$Slottable]

type IComponentFn = <T>(
  createCallback: (...args: IBehavior<unknown, unknown>[]) => IComponentResult<T>
) => (iTether: IOutputTethers<T>) => I$Slottable

class Component<T> implements IStream<ISlottable> {
  constructor(
    readonly build: () => IComponentResult<T>,
    readonly outputTethers: IOutputTethers<T>
  ) {}

  run(sink: ISink<ISlottable>, scheduler: IScheduler): Disposable {
    const [view, outputSources] = this.build()

    const outputDisposables: Disposable[] = []
    const outputSink: ISink<unknown> = {
      event() {},
      end() {},
      error() {}
    }

    for (const k in this.outputTethers) {
      const consumerSampler = this.outputTethers[k]
      if (!consumerSampler) continue

      const outputSource = outputSources?.[k]
      if (outputSource === undefined) {
        const available = outputSources ? Object.keys(outputSources).join(', ') || '(none)' : '(none)'
        sink.error(
          scheduler.time(),
          new Error(`[aelea] component tether '${String(k)}' has no matching output; outputs: ${available}`)
        )
        continue
      }

      outputDisposables.push(consumerSampler(outputSource).run(outputSink, scheduler))
    }

    const viewDisposable = view.run(sink, scheduler)
    return outputDisposables.length === 0 ? viewDisposable : disposeBoth(viewDisposable, disposeAll(outputDisposables))
  }
}

/**
 * A component is a function of behaviors, one per declared parameter, that
 * returns its view and the outputs a parent can tether. Output pipelines run
 * for their side effect; their errors already reach the behavior consumers
 * through the tether side, so the primary sink drops them.
 */
export const component: IComponentFn = createCallback => outputTethers =>
  new Component(() => {
    const behaviors = Array.from({ length: createCallback.length }, behavior)
    return createCallback(...behaviors)
  }, outputTethers)
