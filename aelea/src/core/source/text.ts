import { map, mergeArray, now } from '@most/core'
import type { Scheduler, Sink, Stream } from '@most/types'
import { filterNull } from '../../utils/combinator.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'
import type { ISlottable } from './node.js'

export type I$Text = Stream<ISlottable<Text>>

class TextSource implements I$Text {
  constructor(private textSourceList: (Stream<string> | string)[]) {}

  run(sink: Sink<ISlottable<Text>>, scheduler: Scheduler): Disposable {
    if (this.textSourceList.length === 1) {
      const textSource = this.textSourceList[0]

      if (typeof textSource === 'string') {
        return now({
          disposable: new SettableDisposable(),
          element: document.createTextNode(textSource)
        }).run(sink, scheduler)
      }

      let createdTextNode: Text

      return filterNull(
        map((nextValue) => {
          if (createdTextNode) {
            createdTextNode.nodeValue = nextValue
            return null
          }

          createdTextNode = document.createTextNode(nextValue)

          return {
            disposable: new SettableDisposable(),
            element: createdTextNode
          }
        }, textSource)
      ).run(sink, scheduler)
    }

    const mappedSourceList = this.textSourceList.map((textSource) => {
      if (typeof textSource === 'string') {
        return now({
          disposable: new SettableDisposable(),
          element: document.createTextNode(textSource)
        })
      }

      let createdTextNode: Text

      return filterNull(
        map((nextValue) => {
          if (createdTextNode) {
            createdTextNode.nodeValue = nextValue
            return null
          }

          createdTextNode = document.createTextNode(nextValue)

          return {
            disposable: new SettableDisposable(),
            element: createdTextNode
          }
        }, textSource)
      )
    })

    return mergeArray(mappedSourceList).run(sink, scheduler)
  }
}

export const $text = (...textSourceList: (Stream<string> | string)[]): I$Text => new TextSource(textSourceList)
