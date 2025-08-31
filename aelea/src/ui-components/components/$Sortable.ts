import {
  combineMap,
  constant,
  filter,
  joinMap,
  map,
  merge,
  now,
  o,
  sampleMap,
  skipRepeats,
  start,
  switchLatest,
  until
} from '../../stream/index.js'
import { behavior, type IBehavior, multicast } from '../../stream-extended/index.js'
import { component } from '../../ui/combinator/component.js'
import { fromEventTarget, nodeEvent } from '../../ui/combinator/event.js'
import { style, styleBehavior, styleInline } from '../../ui/combinator/style.js'
import { motion } from '../../ui/index.js'
import type { I$Node, ISlottable } from '../../ui/types.js'
import { $column, $row } from '../elements/$elements.js'
import { layoutSheet } from '../style/layoutSheet.js'

const clamp = (val: number, min: number, max: number) => (val > max ? max : val < min ? min : val)

const remove = (idx: number, arr: any[]) => {
  if (idx < 0 || idx >= arr.length) throw new Error('Index out of bounds')
  return arr.slice(0, idx).concat(arr.slice(idx + 1))
}

const swap = <T>(a: T, idx: number, arr: T[]) => {
  const currentIdx = arr.indexOf(a)
  if (currentIdx === -1) throw new Error('unable to find element within the array')

  const newArr = remove(currentIdx, arr)
  newArr.splice(idx, 0, a)

  return newArr
}

const $dragItem = $row(style({ cursor: 'grab', width: '100%', position: 'absolute' }))

interface DraggableList<T extends I$Node> {
  $list: T[]
  itemHeight: number
  gap?: number
}

interface DraggingState<T extends I$Node> {
  $draggedItem: T
  list: T[]
  isDragging: boolean
  to: number
  delta: number
}

export const $Sortable = <T extends I$Node>(config: DraggableList<T>) =>
  component(([orderChange, orderChangeTether]: IBehavior<DraggingState<T>, DraggingState<T>>) => {
    const gap = config.gap ?? 0
    const listLength = config.$list.length
    const itemHeight = gap + config.itemHeight
    const containerHeight = listLength > 1 ? itemHeight * listLength : config.itemHeight

    const orderMulticat = multicast(orderChange)
    // Add delay(0) to break the synchronous circular dependency
    // This prevents stack overflow when drag events update the list
    const $listChangesWithInitial = start(
      config.$list,
      map(s => s.list, orderMulticat)
    )
    const draggingMotion = motion({ stiffness: 150, damping: 20 })

    return [
      $column(
        layoutSheet.flex,
        style({
          flex: 1,
          userSelect: 'none',
          position: 'relative',
          height: `${containerHeight}px`
        })
      )(
        ...config.$list.map(($item, i) => {
          const [dragY, dragYTether]: IBehavior<ISlottable, DraggingState<T>> = behavior()

          const multicastedDrag = multicast(dragY)
          const isDraggingStream = skipRepeats(map(x => x.isDragging, multicastedDrag))
          const iHeight = config.itemHeight + (config.gap ?? 0)

          const yMotion = o(
            filter(({ $draggedItem }: DraggingState<T>) => $draggedItem !== $item),
            map(({ list }) => list.indexOf($item) * iHeight)
          )(orderMulticat)

          const yDragPosition = merge(
            joinMap(s => {
              if (s.isDragging) {
                return constant(s.delta, now)
              }

              const init = constant(s.list.indexOf($item) * iHeight, now)
              return draggingMotion(start(s.delta, init))
            }, multicastedDrag),
            draggingMotion(start(i * iHeight, yMotion))
          )

          const applyTransformStyle = combineMap(
            (ypos, scale) => ({
              transform: `translateY(${ypos}px) scale(${scale})`
            }),
            yDragPosition,
            draggingMotion(
              start(
                1,
                map(id => (id ? 1.1 : 1), isDraggingStream)
              )
            )
          )

          const applyBoxShadowStyle = map(
            shadow => ({
              boxShadow: `0px ${shadow}px ${shadow * 3}px 0px rgba(0, 0, 0, 0.25`
            }),
            draggingMotion(
              start(
                0,
                map(id => (id ? 5 : 0), isDraggingStream)
              )
            )
          )

          return $dragItem(
            dragYTether(
              nodeEvent('pointerdown'),
              // list order continously changing, sampleMap is used to get a sample of the latest list
              sampleMap((list, startEv) => {
                const drag = merge(fromEventTarget(window, 'pointerup'), fromEventTarget(window, 'pointermove'))
                const moveUntilUp = until(
                  filter(ev => ev.type === 'pointerup', drag),
                  drag
                )

                return map((pointerEvent: PointerEvent) => {
                  const from = list.indexOf($item)
                  const delta = pointerEvent.clientY - (startEv.clientY - from * iHeight)
                  const to = clamp(Math.round(delta / iHeight), 0, list.length - 1)
                  const isPositionChange = to !== from
                  const isDragging = pointerEvent.type === 'pointermove'

                  return {
                    delta,
                    isDragging,
                    to,

                    $draggedItem: isDragging ? $item : null,
                    list: isPositionChange ? swap($item, to, list) : list
                  }
                }, moveUntilUp)
              }, $listChangesWithInitial),
              switchLatest,
              orderChangeTether()
            ),

            styleInline(merge(applyTransformStyle, applyBoxShadowStyle)),

            styleBehavior(map(x => ({ zIndex: x ? 1000 : 0 }), isDraggingStream))
          )($item)
        })
      ),

      { orderChange: $listChangesWithInitial }
    ]
  })
