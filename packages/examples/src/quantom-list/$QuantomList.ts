
import { map } from '@most/core';
import { $text, Behavior, component } from 'fufu';
import { $column, $seperator } from '../common/common';
import * as designSheet from '../common/style/stylesheet';
import $VirtualScroll, { QuantomScrollLocation } from './$QuantomScroll';


const formatNumber = Intl.NumberFormat().format

export default component((
    [sampleLocation, location]: Behavior<QuantomScrollLocation, QuantomScrollLocation>
) => {

    const totalItems = 1e6

    return [
        $column(designSheet.spacingBig)(

            $text(map(l => `From: ${formatNumber(l.from)} To: ${formatNumber(l.to)}`, location)),

            $seperator,
            $VirtualScroll({
                rowHeight: 30,
                maxContainerHeight: 300,
                // totalItems: 1e5,
                requestItemsOp: map(l => {
                    const segment = l.to - l.from;
                    const arr = Array(segment)
                    const $items = arr.fill(undefined).map((x, i) => {
                        const id = totalItems - (l.to - i) + 1

                        return $text('item-#' + formatNumber(id))
                    })

                    return { $items, totalItems }
                })
            })({
                location: sampleLocation()
            })

        )
    ]
})

Intl.NumberFormat()
