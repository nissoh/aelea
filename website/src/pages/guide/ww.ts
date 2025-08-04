// import { constant, map, merge, scan } from 'aelea/stream'
// import { $custom, $element, $text, component, style, INode, nodeEvent } from '@aelea/core'
// import { IBehavior } from '@aelea/core'

// // composable style
// const displayFlex = style({ display: 'flex' })
// const spacingStyle = style({ gap: '16px' })

// // composable elements
// const $row = $custom('row')(displayFlex)
// const $column = $custom('column')(displayFlex, style({ flexDirection: 'column' }))

// // Component that outputs state(optionally), this is currently not used anywhere, see next example to see it being consumed
// export default component((
//     [increment, incrementTether]: IBehavior<INode, 1>,
//     [decrement, decrementTether]: IBehavior<INode, -1>
//   ) => {

//     return [ // Component has to return [$Node, IBehavior(optionally)] in the next example we will use these outputted behaviors

//       $row(spacingStyle)(
//         $column(
//           $element('button')(incrementTether(nodeEvent('click'), constant(1)))(
//             $text('+')
//           ),
//           $element('button')(decrementTether(nodeEvent('click'), constant(-1)))(
//             $text('-')
//           )
//         ),
//         $text(style({ fontSize: '64px' }))(
//           map(String, aggregate((current: number, x: number) => current + x, 0, merge(increment, decrement)))
//         )
//       ),

//       { increment, decrement }
//     ]
//   }
// )({})
