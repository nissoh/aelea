import { map, now } from '@most/core'
import { disposeAll, disposeBoth } from '@most/disposable'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { filterNull } from '../../utils/combinator.js'
import type { IOps } from '../common.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'
import { $custom, type ISlottable } from './node.js'

class TextSource implements Stream<ISlottable<Text>> {
  constructor(private textSourceList: (Stream<string> | string)[]) {}

  run(sink: Sink<ISlottable<Text>>, scheduler: Scheduler): Disposable {
    const disposableList = this.textSourceList.map((textSource) => {
      const sourceDisposable = new SettableDisposable()

      if (typeof textSource === 'string') {
        const runDisposable = now({
          disposable: sourceDisposable,
          element: document.createTextNode(textSource)
        }).run(sink, scheduler)

        return disposeBoth(runDisposable, sourceDisposable)
      }

      let createdTextNode: Text

      const runDisposable = filterNull(
        map((nextValue) => {
          if (createdTextNode) {
            createdTextNode.nodeValue = nextValue
            return null
          }

          createdTextNode = document.createTextNode(nextValue)

          return {
            disposable: sourceDisposable,
            element: createdTextNode
          }
        }, textSource)
      ).run(sink, scheduler)

      return disposeBoth(runDisposable, sourceDisposable)
    })
    return disposeAll(disposableList)
  }
}

export const $text = (...textSourceList: (Stream<string> | string)[]): Stream<ISlottable<Text>> =>
  new TextSource(textSourceList)

export const $textNode = (compose: IOps<any, any>, ...textSourceList: (Stream<string> | string)[]) => {
  // $custom('text')($text(...textSourceList))

  return $custom('text')(compose)($text(...textSourceList))
}
