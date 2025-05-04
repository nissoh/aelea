import { now, map } from '@most/core'
import { disposeBoth, disposeAll } from '@most/disposable'
import type { Stream, Sink, Scheduler, Disposable } from '@most/types'
import { filterNull } from '../../utils/combinator.js'
import type { INode } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

class TextSource implements Stream<INode<Text>> {
  constructor(private textSourceList: (Stream<string> | string)[]) {}

  run(sink: Sink<INode<Text>>, scheduler: Scheduler): Disposable {
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

export const $text = (...textSourceList: (Stream<string> | string)[]): Stream<INode<Text>> =>
  new TextSource(textSourceList)
