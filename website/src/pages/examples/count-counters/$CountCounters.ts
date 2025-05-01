import {
  scan,
  mergeArray,
  merge,
  now,
  constant,
  chain,
  multicast,
  until,
  snapshot,
  map,
} from '@most/core'
import { type Behavior, behavior, replayLatest, O } from 'aelea/core'
import { $text, component, style } from 'aelea/dom'
import {
  $Button,
  $column,
  $row,
  $seperator,
  spacing,
} from 'aelea/ui-components'
import { $TrashBtn } from '../../../elements/$common'
import $Counter from './$Counter'
import { pallete } from 'aelea/ui-components-theme'

const $AddBtn = $Button({
  $content: $text('Add One'),
})
export const sumAdd = scan((current: number, x: number) => current + x)

export default component(
  (
    [addedCounter, addedCounterTether]: Behavior<PointerEvent, PointerEvent>,
    [disposeCounter, disposeCounterTether]: Behavior<
      PointerEvent,
      PointerEvent
    >,
    [counterIncrement, countersIncrementTether]: Behavior<1, 1>,
    [counterDecrement, countersDecrementTether]: Behavior<-1, -1>,
    [disposedCounterCount, disposedCounterCountTether]: Behavior<any, number>,
  ) => {
    const INITAL_COUNT = 0
    const sumWithInitial = sumAdd(INITAL_COUNT)

    const counting = mergeArray([
      disposedCounterCount,
      counterIncrement,
      counterDecrement,
    ])
    const totalCount = sumWithInitial(counting)

    const addCounter = merge(addedCounter, now(null))

    return [
      $column(spacing.default)(
        $row(
          style({ placeContent: 'space-between', alignItems: 'center' }),
          spacing.default,
        )(
          $row(spacing.small)(
            $text(style({ color: pallete.foreground }))('Counters: '),
            $text(
              map(
                String,
                sumWithInitial(
                  merge(constant(1, addCounter), constant(-1, disposeCounter)),
                ),
              ),
            ),
          ),
          $row(spacing.small)(
            $text(style({ color: pallete.foreground }))('Sum: '),
            $text(map(String, totalCount)),
          ),
          $AddBtn({
            click: addedCounterTether(),
          }),
        ),
        chain(() => {
          const [remove, removeTether] = behavior<PointerEvent, PointerEvent>()
          const [valueChange, valueChangeTether] = behavior<number, number>()

          const value = replayLatest(multicast(valueChange), 0)

          return until(remove)(
            $column(spacing.default)(
              $seperator,
              $row(style({ alignItems: 'center' }), spacing.big)(
                $TrashBtn({
                  click: O(
                    removeTether(),
                    disposeCounterTether(),
                    disposedCounterCountTether(snapshot((val) => -val, value)),
                  ),
                }),
                $Counter({ value })({
                  increment: O(
                    countersIncrementTether(),
                    valueChangeTether(
                      snapshot((val, increment) => val + increment, value),
                    ),
                  ),
                  decrement: O(
                    countersDecrementTether(),
                    valueChangeTether(
                      snapshot((val, increment) => val + increment, value),
                    ),
                  ),
                }),
              ),
            ),
          )
        }, addCounter),
      ),
    ]
  },
)
