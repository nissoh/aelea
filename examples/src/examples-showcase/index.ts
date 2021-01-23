import { $Branch, $element, $node, $text, behavior, Behavior, component, event, eventElementTarget, IBranch, IBranchElement, runBrowser, style } from '@aelea/core'
import { path, router } from '@aelea/router'
import { chain, map, merge, mergeArray, multicast, now, switchLatest, until } from '@most/core'
import { $column, $main, $row } from '../common/common'
import { flex, spacing, spacingBig, spacingSmall, theme } from '../common/stylesheet'
import $Calculator from '../components/$Calculator'
import $CountCounters from '../components/$CountCounters'
import $VirtualList from '../components/$QuantumList'
import { ScrollSegment } from '../components/$QuantumScroll'
import $Spring from '../components/$Spring'
import $Table from '../components/$Table'
import { createTodo } from '../components/todo-app/$CreateTodo'
import $TodoApp from '../components/todo-app/$TodoApp'
import $Example from './$Example'
import { $Link } from './common'


const initialPath = map(location => location.pathname, now(document.location))
const popStateEvent = eventElementTarget('popstate', window)
const locationChange = map(() => document.location.pathname, popStateEvent)

const $PanningUI = component((
  // []: Behavior<NodeChild, any>,
  [sampleLinkClick, routeChanges]: Behavior<string, string>
) => {

  const routeChange = mergeArray([
    initialPath,
    locationChange,
    multicast(routeChanges)
  ])

  const rootRoute = router(routeChange)


  const dragAngDropRoute = rootRoute.create('drag-and-sort')
  const todoAppRoute = rootRoute.create('todo-app')
  const countCountersRoute = rootRoute.create('count-counters')
  const quantumListRoute = rootRoute.create('quantum-list')
  const calculatorRoute = rootRoute.create('calculator')
  const tableRoute = rootRoute.create('table')

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

  const $table = $Table<{ id: string }>({
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


  return [

    path(rootRoute)(
      $row(spacingBig, flex, style({ placeContent: 'center' }))(

        $column(spacing, style({ position: 'sticky', alignSelf: 'flex-start', top: '10vh', placeContent: 'center flex-start' }))(

          $text(style({ color: theme.base }))('Fufu Examples'),

          $column(spacingSmall, style({ alignItems: 'flex-start' }))(

            $Link({ $content: $text('Drag And Sort'), href: '/drag-and-sort', route: dragAngDropRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Table'), href: '/table', route: tableRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Calculator'), href: '/calculator', route: calculatorRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Quantum List'), href: '/quantum-list', route: quantumListRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Count Counters'), href: '/count-counters', route: countCountersRoute })({
              click: sampleLinkClick()
            }),

            $Link({ $content: $text('Todo App'), href: '/todo-app', route: todoAppRoute })({
              click: sampleLinkClick()
            }),
          )

        ),

        $node(style({ borderLeft: `1px solid ${theme.baseLight}` }))(),

        $column(

          $container(
            path(dragAngDropRoute)(
              $Example({ file: 'src/components/$DragSort.ts' })(

                component(([sampleOrder, order]: Behavior<$Branch<IBranchElement, {}>[], $Branch<IBranchElement, {}>[]>) => {

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
                      })({ orderChange: sampleOrder() }),
                      $node(
                        switchLatest(
                          map(($nodes) => $node(...$nodes), order)
                        )
                      )
                    )
                  ]
                })({})

              )({})
            )
          ),

          $container(
            path(tableRoute)(
              $Example({ file: 'src/components/$Table.ts' })(
                $table
              )({})
            )
          ),

          $container(
            path(calculatorRoute)(
              $Example({ file: 'src/components/$Calculator.ts' })(
                $Calculator({})
              )({})
            )
          ),

          $container(
            path(quantumListRoute)(
              $Example({ file: 'src/components/$QuantumList.ts' })(
                $VirtualList({})
              )({})
            )
          ),

          $container(
            path(countCountersRoute)(
              $Example({ file: 'src/components/$CountCounters.ts' })(
                $CountCounters({})
              )({})
            )
          ),

          $container(
            path(todoAppRoute)(
              $Example({ file: 'src/components/todo-app/$TodoApp.ts' })(
                $TodoApp(
                  Array(1e2).fill(null).map((x, i) => createTodo('t-' + (i + 1)))
                )({})

              )({})
            )
          ),

        )

      )
    )

  ]
})

// sampleClick(event('click'))

runBrowser({ rootNode: document.body })(
  $main(style({ alignItems: 'center', justifyContent: 'center', }))(

    // $Example({ file: 'src/components/$DragSort.ts' })(
    //   component((
    //     [sampleButtonClick, buttonClick]: Behavior<IBranch, PointerEvent>
    //   ) => {

    //     const buttonClickBehavior = sampleButtonClick(
    //       event('pointerdown')
    //     )

    //     const $list = Array(4).fill(null).map((_, i) =>
    //       $column(flex, style({ backgroundColor: theme.baseLight, placeContent: 'center', height: '90px', alignItems: 'center' }))(
    //         $text('node: ' + i)
    //       )
    //     )

    //     const $dndSpring = $Spring({
    //       $list,
    //       itemHeight: 90,
    //       gap: 10
    //     })({})

    //     return [
    //       $row(

    //         $element('button')(buttonClickBehavior)(
    //           $text('click meh')
    //         ),

    //         merge(
    //           until(buttonClick)(
    //             $dndSpring
    //           ),
    //           $text('ello2')
    //         ),

    //         // join(constant(until(buttonClick, $dndSpring), buttonClick))


    //         // $node(
    //         //   switchLatest(
    //         //     map(($nodes) => $node(...$nodes), order)
    //         //   )
    //         // )
    //       )
    //     ]
    //   })({})

    // )({})

    $PanningUI({})
  )
)

