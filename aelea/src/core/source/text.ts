import { map, now } from '@most/core'
import { disposeAll, disposeBoth } from '@most/disposable'
import type { Disposable, Scheduler, Sink, Stream } from '@most/types'
import { filterNull } from '../../utils/combinator.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'
import type { ISlottable } from './node.js'

export type I$Text = Stream<ISlottable<Text>>

class TextSource implements I$Text {
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

export const $text = (...textSourceList: (Stream<string> | string)[]): I$Text => new TextSource(textSourceList)
