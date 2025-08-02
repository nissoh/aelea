import type { IStream } from '../../stream/index.js'
import { empty, filterNull, map, merge, now, op } from '../../stream/index.js'
import type { ISlottable } from '../types.js'
import { SettableDisposable } from '../utils/SettableDisposable.js'

export type I$Text = IStream<ISlottable<Text>>

function createDynamicTextStream(textSource: IStream<string>): I$Text {
  let textNode: Text | undefined

  return op(
    textSource,
    map((value) => {
      if (textNode) {
        textNode.nodeValue = value
        return null
      }

      textNode = document.createTextNode(value)
      return {
        element: textNode,
        disposable: new SettableDisposable()
      }
    }),
    filterNull
  )
}

export const $text = (...textSourceList: (IStream<string> | string)[]): I$Text => {
  if (textSourceList.length === 0) return empty

  if (textSourceList.length === 1) {
    const source = textSourceList[0]
    return typeof source === 'string' ? createStaticTextStream(source) : createDynamicTextStream(source)
  }

  const streams = textSourceList.map((source) =>
    typeof source === 'string' ? createStaticTextStream(source) : createDynamicTextStream(source)
  )

  return merge(...streams)
}

function createStaticTextStream(text: string): I$Text {
  return now({
    element: document.createTextNode(text),
    disposable: new SettableDisposable()
  })
}
