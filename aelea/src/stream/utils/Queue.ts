/**
 * Circular buffer implementation for O(1) push/shift operations
 * Based on denque's design for high-performance queue operations
 */
export class Queue<T> {
  private head = 0
  private tail = 0
  private capacityMask = 0x3
  private list: (T | undefined)[] = new Array(4)

  push(item: T): void {
    this.list[this.tail] = item
    this.tail = (this.tail + 1) & this.capacityMask

    if (this.tail === this.head) {
      this.growArray()
    }
  }

  shift(): T | undefined {
    const head = this.head
    if (head === this.tail) {
      return undefined
    }

    const item = this.list[head]
    this.list[head] = undefined
    this.head = (head + 1) & this.capacityMask

    // Shrink if queue is mostly empty and large
    if (head < 2 && this.tail > 10000 && this.tail <= this.list.length >>> 2) {
      this.shrinkArray()
    }

    return item
  }

  isEmpty(): boolean {
    return this.head === this.tail
  }

  length(): number {
    if (this.head <= this.tail) {
      return this.tail - this.head
    }
    return this.capacityMask + 1 - (this.head - this.tail)
  }

  private growArray(): void {
    if (this.head !== 0) {
      // Copy existing data: head to end, then beginning to tail
      const newList: (T | undefined)[] = []
      const len = this.list.length

      for (let i = this.head; i < len; i++) {
        newList.push(this.list[i])
      }
      for (let i = 0; i < this.tail; i++) {
        newList.push(this.list[i])
      }

      this.list = newList
      this.head = 0
      this.tail = newList.length
    } else {
      // Head is at 0, array is full, safe to extend
      this.tail = this.list.length
    }

    this.list.length *= 2
    this.capacityMask = (this.capacityMask << 1) | 1
  }

  private shrinkArray(): void {
    this.list.length >>>= 1
    this.capacityMask >>>= 1
  }
}
