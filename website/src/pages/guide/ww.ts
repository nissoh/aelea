// import { constant, map, merge, scan } from '@most/core'
// import { $custom, $element, $text, component, style, INode, nodeEvent } from '@aelea/dom'
// import { Behavior } from '@aelea/core'

// // composable style
// const displayFlex = style({ display: 'flex' })
// const spacingStyle = style({ gap: '16px' })

// // composable elements
// const $row = $custom('row')(displayFlex)
// const $column = $custom('column')(displayFlex, style({ flexDirection: 'column' }))

// // Component that outputs state(optionally), this is currently not used anywhere, see next example to see it being consumed
// export default component((
//     [increment, incrementTether]: Behavior<INode, 1>,
//     [decrement, decrementTether]: Behavior<INode, -1>
//   ) => {

//     return [ // Component has to return [$Node, Behavior(optionally)] in the next example we will use these outputted behaviors

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
//           map(String, scan((current: number, x: number) => current + x, 0, merge(increment, decrement)))
//         )
//       ),

//       { increment, decrement }
//     ]
//   }
// )({})
