import { $custom, $node, $svg, attr, $wrapNativeElement, style } from 'fufu'
import $ButtonIcon from '../components/form/$ButtonIcon'

import * as designSheet from './stylesheet'


export const $bodyRoot = $wrapNativeElement(document.body)(designSheet.main)

export const $row = $custom('row')(designSheet.row)
export const $column = $custom('column')(designSheet.column)

export const $card = $column(style({
    padding: '16px',
    backgroundColor: designSheet.theme.baseLight,
    boxShadow: '10px 10px 0px -6px rgba(0, 0, 0, .25)',
}))

export const $mainCard = $card(designSheet.spacingBig, style({ width: '400px', margin: '0 auto' }))

export const $seperator = $node(
    style({
        minHeight: '1px',
        minWidth: '1px',
        background: designSheet.theme.baseDark
    })
)()

export const $TrashBtn = $ButtonIcon(
    $svg('path')(
        attr({
            d: 'M6.24 18.84A2.16 2.16 0 008.4 21h7.2a2.16 2.16 0 002.16-2.16L19.2 7.32H4.8l1.44 11.52zm7.92-9.36h1.44v9.36h-1.44V9.48zm-2.88 0h1.44v9.36h-1.44V9.48zm-2.88 0h1.44v9.36H8.4V9.48zm10.44-5.04h-4.68S13.838 3 13.44 3h-2.88c-.398 0-.72 1.44-.72 1.44H5.16a1.08 1.08 0 00-1.08 1.08V6.6h15.84V5.52a1.08 1.08 0 00-1.08-1.08z'
        })
    )()
)

