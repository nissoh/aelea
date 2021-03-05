import { $node, $text, Behavior, component, style } from '@aelea/core'
import { contains, Route } from '@aelea/router'
import { $column, $row, layoutSheet } from '@aelea/ui-components'
import { theme } from '@aelea/ui-components-theme'
import $Example from '../../components/$Example'
import { $Link } from '../../components/$Link'
import { fadeIn } from '../../components/transitions/enter'
import $Calculator from './calculator/$Calculator'
import $CountCounters from './count-counters/$CountCounters'
import $DragList from './dragList/$DragList'
import $VirtualList from './quantum-list/$QuantumList'
import $Table from './table/$Table'
import { createTodo } from './todo-app/$CreateTodo'
import $TodoApp from './todo-app/$TodoApp'




interface Website {
  router: Route
}

export default ({ router }: Website) => component((
  [sampleLinkClick, routeChanges]: Behavior<string, string>
) => {

  const dragAngDropRoute = router.create({ fragment: 'drag-and-sort', title: 'Drag N Drop' })
  const todoAppRoute = router.create({ fragment: 'todo-app', title: 'Todo App' })
  const countCountersRoute = router.create({ fragment: 'count-counters', title: 'Count Counters' })
  const quantumListRoute = router.create({ fragment: 'quantum-list', title: 'Quantum List' })
  const calculatorRoute = router.create({ fragment: 'calculator', title: 'Calculator' })
  const tableRoute = router.create({ fragment: 'table', title: 'Table' })

  const $container = $row(
    style({ placeContent: 'center', scrollSnapAlign: 'start' })
  )



  return [

    $row(layoutSheet.spacingBig, layoutSheet.flex, style({ placeContent: 'center' }))(

      fadeIn(
        $column(layoutSheet.spacing, style({ flex: 2, top: '10vh', placeContent: 'center flex-start' }))(

          $column(layoutSheet.spacingSmall, style({ alignItems: 'flex-start' }))(
            $Link({ $content: $text('Drag And Sort'), url: '/p/examples/drag-and-sort', route: dragAngDropRoute })({
              click: sampleLinkClick()
            }),
            $Link({ $content: $text('Quantum List'), url: '/p/examples/quantum-list', route: quantumListRoute })({
              click: sampleLinkClick()
            }),
            $Link({ $content: $text('Count Counters'), url: '/p/examples/count-counters', route: countCountersRoute })({
              click: sampleLinkClick()
            }),
            $Link({ $content: $text('Todo App'), url: '/p/examples/todo-app', route: todoAppRoute })({
              click: sampleLinkClick()
            }),
            $Link({ $content: $text('Table'), url: '/p/examples/table', route: tableRoute })({
              click: sampleLinkClick()
            }),
            $Link({ $content: $text('Calculator'), url: '/p/examples/calculator', route: calculatorRoute })({
              click: sampleLinkClick()
            }),
          )

        )
      ),

      $node(),

      $column(style({ flex: 2 }))(

        $container(
          contains(dragAngDropRoute)(
            $Example({ file: 'src/components/$DragSort.ts' })(
              $DragList({})
            )({})
          )
        ),

        $container(
          contains(tableRoute)(
            $Example({ file: 'src/components/$Table.ts' })(
              $column(style({ border: `1px solid ${theme.baseLight}` }))(
                $Table({})
              )
            )({})
          )
        ),

        $container(
          contains(calculatorRoute)(
            $Example({ file: 'src/components/$Calculator.ts' })(
              $Calculator({})
            )({})
          )
        ),

        $container(
          contains(quantumListRoute)(
            $Example({ file: 'src/components/$QuantumList.ts' })(
              $VirtualList({})
            )({})
          )
        ),

        $container(
          contains(countCountersRoute)(
            $Example({ file: 'src/components/$CountCounters.ts' })(
              $CountCounters({})
            )({})
          )
        ),

        $container(
          contains(todoAppRoute)(
            $Example({ file: 'src/components/todo-app/$TodoApp.ts' })(
              $TodoApp(
                Array(1e2).fill(null).map((x, i) => createTodo('t-' + (i + 1)))
              )({})
            )({})
          )
        ),

      )

    ),


    {
      routeChanges
    }

  ]
})


