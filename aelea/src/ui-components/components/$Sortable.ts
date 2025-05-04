import {
  chain,
  combine,
  filter,
  map,
  merge,
  multicast,
  now,
  skipAfter,
  skipRepeats,
  snapshot,
  startWith,
  switchLatest
} from '@most/core'
import { remove } from '@most/prelude'
import { O } from '../../core/common.js'
import { behavior } from '../../core/index.js'
import { motion } from '../../core/combinator/animate.js'
import { component } from '../../core/combinator/component.js'
import { eventElementTarget, nodeEvent } from '../../core/combinator/event.js'
import { style, styleBehavior, styleInline } from '../../core/combinator/style.js'
import type { INode } from '../../core/types.js'
import type { I$Branch } from '../../core/source/node.js'
import { $column, $row } from '../elements/$elements.js'
import { layoutSheet } from '../style/layoutSheet.js'
import type { IBehavior } from '../../core/combinator/behavior.js'

const clamp = (val: number, min: number, max: number) => (val > max ? max : val < min ? min : val)

const swap = <T>(a: T, idx: number, arr: T[]) => {
  const currentIdx = arr.indexOf(a)
  if (currentIdx === -1) throw new Error('unable to find element within the array')

  const newArr = remove(currentIdx, arr)
  newArr.splice(idx, 0, a)

  return newArr
}

const $dragItem = $row(style({ cursor: 'grab', width: '100%', position: 'absolute' }))

interface DraggableList<T extends I$Branch> {
  $list: T[]
  itemHeight: number
  gap?: number
}

interface DraggingState<T extends I$Branch> {
  $draggedItem: T
  list: T[]
  isDragging: boolean
  to: number
  delta: number
}

export const $Sortable = <T extends I$Branch>(config: DraggableList<T>) =>
  component(([orderChange, orderChangeTether]: IBehavior<DraggingState<T>, DraggingState<T>>) => {
    const gap = config.gap ?? 0
    const listLength = config.$list.length
    const itemHeight = gap + config.itemHeight
    const containerHeight = listLength > 1 ? itemHeight * listLength : config.itemHeight

    const orderMulticat = multicast(orderChange)
    const $listChangesWithInitial = startWith(
      config.$list,
      map((s) => s.list, orderMulticat)
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
          const [dragY, dragYTether]: IBehavior<INode, DraggingState<T>> = behavior()

          const multicastedDrag = multicast(dragY)
          const isDraggingStream = skipRepeats(map((x) => x.isDragging, multicastedDrag))
          const iHeight = config.itemHeight + (config.gap ?? 0)

          const yMotion = O(
            filter(({ $draggedItem }: DraggingState<T>) => $draggedItem !== $item),
            map(({ list }) => list.indexOf($item) * iHeight)
          )(orderMulticat)

          const yDragPosition = merge(
            chain((s) => {
              if (s.isDragging) {
                return now(s.delta)
              }

              return draggingMotion(s.delta, now(s.list.indexOf($item) * iHeight))
            }, multicastedDrag),
            draggingMotion(i * iHeight, yMotion)
          )

          const applyTransformStyle = combine(
            (ypos, scale) => ({
              transform: `translateY(${ypos}px) scale(${scale})`
            }),
            yDragPosition,
            draggingMotion(
              1,
              map((id) => (id ? 1.1 : 1), isDraggingStream)
            )
          )

          const applyBoxShadowStyle = map(
            (shadow) => ({
              boxShadow: `0px ${shadow}px ${shadow * 3}px 0px rgba(0, 0, 0, 0.25`
            }),
            draggingMotion(
              0,
              map((id) => (id ? 5 : 0), isDraggingStream)
            )
          )

          return $dragItem(
            dragYTether(
              nodeEvent('pointerdown'),
              // list order continously changing, snapshot is used to get a(snapshot) of the latest list
              snapshot((list, startEv) => {
                const drag = merge(eventElementTarget('pointerup', window), eventElementTarget('pointermove', window))
                const move = skipAfter((ev) => ev.type === 'pointerup', drag)

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
                }, move)
              }, $listChangesWithInitial),
              switchLatest,
              orderChangeTether()
            ),

            styleInline(merge(applyTransformStyle, applyBoxShadowStyle)),

            styleBehavior(map((x) => ({ zIndex: x ? 1000 : 0 }), isDraggingStream))
          )($item)
        })
      ),

      { orderChange: $listChangesWithInitial }
    ]
  })
