import { $Branch, $node, $text, behavior, Behavior, component, IBranchElement, style } from '@aelea/core'
import { contains, Route } from '@aelea/router'
import { chain, map } from '@most/core'
import { $column, $main, $row } from '../../common/common'
import { flex, spacing, spacingBig, spacingSmall, theme } from '../../common/stylesheet'
import $Calculator from '../../components/$Calculator'
import $CountCounters from '../../components/$CountCounters'
import $Example from '../../components/$Example'
import { $Link } from '../../components/$Link'
import $VirtualList from '../../components/$QuantumList'
import { ScrollSegment } from '../../components/$QuantumScroll'
import $Spring from '../../components/$Spring'
import $Table from '../../components/$Table'
import { createTodo } from '../../components/todo-app/$CreateTodo'
import $TodoApp from '../../components/todo-app/$TodoApp'
import { fadeIn } from '../../components/transitions/enter'


export { $main }


interface Website {
  router: Route
}

export default ({ router }: Website) => component((
  // []: Behavior<NodeChild, any>,
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

  const [sampleObserved, observed] = behavior<ScrollSegment, ScrollSegment>()

  const dataSource = map(position => {

    const totalItems = 1e6

    const segment = position.to - position.from
    const arr = Array(segment)
    const $items = arr.fill(null).map((x, i) => {
      const id = totalItems - (position.to - i) + 1

      return {
        id: 'item-#' + id
      }
    })

    return { totalItems, data: $items }
  }, observed)


  return [

    $row(spacingBig, flex, style({ placeContent: 'center' }))(

      fadeIn(
        $column(spacing, style({ flex: 2, top: '10vh', placeContent: 'center flex-start' }))(

          $column(spacingSmall, style({ alignItems: 'flex-start' }))(

            $Link({ $content: $text('Drag And Sort'), href: '/examples/drag-and-sort', route: dragAngDropRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Table'), href: '/examples/table', route: tableRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Calculator'), href: '/examples/calculator', route: calculatorRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Quantum List'), href: '/examples/quantum-list', route: quantumListRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Count Counters'), href: '/examples/count-counters', route: countCountersRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Todo App'), href: '/examples/todo-app', route: todoAppRoute })({
              click: sampleLinkClick()
            }),
          )

        )
      ),

      $node(),

      // $node(style({ borderLeft: `1px solid ${theme.baseLight}` }))(),

      $column(style({ flex: 2 }))(

        $container(
          contains(dragAngDropRoute)(
            $Example({ file: 'src/components/$DragSort.ts' })(

              component(([sampleOrder]: Behavior<$Branch<IBranchElement, {}>[], $Branch<IBranchElement, {}>[]>) => {

                const $list = Array(4).fill(null).map((_, i) =>
                  $column(flex, style({ backgroundColor: theme.baseLight, placeContent: 'center', height: '90px', alignItems: 'center' }))(
                    $text('node: ' + i)
                  )
                )

                return [
                  $row(style({ placeContent: 'stretch' }))(
                    $Spring({
                      $list,
                      itemHeight: 90,
                      gap: 10
                    })({ orderChange: sampleOrder() })
                  )
                ]
              })({})

            )({})
          )
        ),

        $container(
          contains(tableRoute)(
            $Example({ file: 'src/components/$Table.ts' })(

              $column(style({ border: `1px solid ${theme.baseLight}` }))(
                $Table<{ id: string }>({
                  maxContainerHeight: 400,
                  dataSource,
                  rowHeight: 30,
                  columns: [
                    {
                      id: 'id',
                      value: chain(x => $text(x.id)),
                    },
                    {
                      id: 'id',
                      value: chain(x => $text(x.id)),
                    },
                    {
                      id: 'id',
                      value: chain(x => $text(x.id)),
                    }
                  ],
                })({ observed: sampleObserved() })
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


