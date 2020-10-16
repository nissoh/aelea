
import { at, debounce, map, switchLatest, take } from '@most/core';
import { $text, Behavior, component, O, state, StateBehavior } from 'fufu';
import { $column, $seperator } from '../common/common';
import * as designSheet from '../common/stylesheet';
import $QuantomScroll, { Position } from './$QuantomScroll';
import $Field from './form/$Field';


const formatNumber = Intl.NumberFormat().format

export default component((
    [samplePosition, position]: Behavior<Position, Position>
) => {

    const [sampleDelayTime, delayTime]: StateBehavior<string, number> = state(1500)

    return [
        $column(designSheet.spacingBig)(

            $text(map(l => `From: ${formatNumber(l.from)} To: ${formatNumber(l.to)}`, position)),

            $Field({ label: 'Delay Response(ms)', setValue: take(1, map(String, delayTime)) })({
                value: sampleDelayTime(map(Number))
            }),

            $seperator,

            switchLatest(
                map(dt => (
                    $QuantomScroll({
                        rowHeight: 30,
                        maxContainerHeight: 300,
                        queryItemsOp: O(
                            debounce(455), // deboucees fast scrolling to avoid unecessary reuqests
                            map(positionChange => {
                                const totalItems = 1e6

                                const segment = positionChange.to - positionChange.from
                                const arr = Array(segment)
                                const $items = arr.fill(undefined).map((x, i) => {
                                    const id = totalItems - (positionChange.to - i) + 1

                                    return $text('item-#' + formatNumber(id))
                                })

                                // respond back with a delayed event
                                return at(dt, { $items, totalItems })
                            })
                        )
                    })({
                        position: samplePosition()
                    })
                ), delayTime)
            )


        )
    ]
})

