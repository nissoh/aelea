import type { IStream } from '../types.js'
import { merge } from './merge.js'

/**
 * Merge an array of streams into a single stream
 * @param streams array of streams to merge
 * @returns merged stream containing events from all input streams
 */
export const mergeArray = <T>(streams: IStream<T>[]): IStream<T> => {
  if (streams.length === 0) {
    throw new Error('mergeArray requires at least one stream')
  }
  if (streams.length === 1) {
    return streams[0]
  }
  return streams.reduce((acc, stream) => merge(acc, stream))
}
