/**
 * Immutably append an element to an array
 * Optimized for small arrays (common case for multicast)
 */
export function append<T>(array: readonly T[], element: T): readonly T[] {
  const len = array.length

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

  const result = new Array(len - 1)
  for (let i = 0; i < index; i++) {
    result[i] = array[i]
  }
  for (let i = index + 1; i < len; i++) {
    result[i - 1] = array[i]
  }
  return result
}
