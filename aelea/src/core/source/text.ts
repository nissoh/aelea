import type { IStream } from '../../stream/index.js'
import { filterNull, map, merge, now, op } from '../../stream/index.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'
import type { ISlottable } from './node.js'

export type I$Text = IStream<ISlottable<Text>>

function createTextSource(textSourceList: (IStream<string> | string)[]): I$Text {
  return {
    run(scheduler, sink) {
      if (textSourceList.length === 1) {
        const textSource = textSourceList[0]

        if (typeof textSource === 'string') {
          return now({
            disposable: new SettableDisposable(),
            element: document.createTextNode(textSource)
          } as ISlottable<Text>).run(scheduler, sink)
        }

        let createdTextNode: Text

        return op(
          textSource,
          map<string, ISlottable<Text> | null>((nextValue) => {
            if (createdTextNode) {
              createdTextNode.nodeValue = nextValue
              return null
            }

            createdTextNode = document.createTextNode(nextValue)

            return {
              disposable: new SettableDisposable(),
              element: createdTextNode
            }
          }),
          filterNull
        ).run(scheduler, sink)
      }

      const mappedSourceList = textSourceList.map((textSource) => {
        if (typeof textSource === 'string') {
          return now({
            disposable: new SettableDisposable(),
            element: document.createTextNode(textSource)
          } as ISlottable<Text>)
        }

        let createdTextNode: Text

        return filterNull(
          map<string, ISlottable<Text> | null>((nextValue) => {
            if (createdTextNode) {
              createdTextNode.nodeValue = nextValue
              return null
            }

            createdTextNode = document.createTextNode(nextValue)

            return {
              disposable: new SettableDisposable(),
              element: createdTextNode
            }
          })(textSource as IStream<string>)
        )
      })

      return merge(...mappedSourceList).run(scheduler, sink)
    }
  }
}

export const $text = (...textSourceList: (IStream<string> | string)[]): I$Text => createTextSource(textSourceList)
