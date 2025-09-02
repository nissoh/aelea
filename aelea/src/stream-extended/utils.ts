import type { ISink, ITime } from '../stream/index.js'

export function tryEvent<T>(sink: ISink<T>, time: ITime, value: T): void {
  try {
    sink.event(time, value)
  } catch (e) {
    sink.error(time, e)
  }
}

export function tryEnd(sink: ISink<unknown>, time: ITime): void {
  try {
    sink.end(time)
  } catch (e) {
    sink.error(time, e)
  }
}

/**
 * Immutably append an element to an array
 * Optimized for small arrays (common case for multicast)
 */
export function append<T>(array: readonly T[], element: T): readonly T[] {
  const len = array.length

  // Optimize for common cases (0-3 elements)
  switch (len) {
    case 0:
      return [element]
    case 1:
      return [array[0], element]
    case 2:
      return [array[0], array[1], element]
    case 3:
      return [array[0], array[1], array[2], element]
  }

  // For 4+ elements, manual copy is most predictable
  const result = new Array(len + 1)
  for (let i = 0; i < len; i++) {
    result[i] = array[i]
  }
  result[len] = element
  return result
}

/**
 * Immutably remove an element at index from an array
 * Optimized for small arrays (common case for multicast)
 */
export function remove<T>(array: readonly T[], index: number): readonly T[] {
  const len = array.length
  if (index < 0 || index >= len) return array

  // Optimize for common cases (1-4 elements)
  switch (len) {
    case 1:
      return []
    case 2:
      return index === 0 ? [array[1]] : [array[0]]
    case 3:
      return index === 0 ? [array[1], array[2]] : index === 1 ? [array[0], array[2]] : [array[0], array[1]]
    case 4:
      return index === 0
        ? [array[1], array[2], array[3]]
        : index === 1
          ? [array[0], array[2], array[3]]
          : index === 2
            ? [array[0], array[1], array[3]]
            : [array[0], array[1], array[2]]
  }

  // For 5+ elements, manual copy for predictable performance
  const result = new Array(len - 1)
  for (let i = 0; i < index; i++) {
    result[i] = array[i]
  }
  for (let i = index + 1; i < len; i++) {
    result[i - 1] = array[i]
  }
  return result
}
