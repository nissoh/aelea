import type { IStream } from '../../stream/index.js'
import { filterNull, map, merge, now, op } from '../../stream/index.js'
import type { ISlottable } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

export type I$Text = IStream<ISlottable<Text>>

function createDynamicTextStream(textSource: IStream<string>): IStream<ISlottable<Text>> {
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
  )
}

export const $text = (...textSourceList: (IStream<string> | string)[]): I$Text => {
  if (textSourceList.length === 1) {
    const textSource = textSourceList[0]

    if (typeof textSource === 'string') {
      return now({
        disposable: new SettableDisposable(),
        element: document.createTextNode(textSource)
      } as ISlottable<Text>)
    }

    return createDynamicTextStream(textSource)
  }

  const mappedSourceList = textSourceList.map((textSource) => {
    if (typeof textSource === 'string') {
      return now({
        disposable: new SettableDisposable(),
        element: document.createTextNode(textSource)
      } as ISlottable<Text>)
    }

    return createDynamicTextStream(textSource)
  })

  return merge(...mappedSourceList)
}
