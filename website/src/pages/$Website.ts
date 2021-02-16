import { $Branch, $node, $text, behavior, Behavior, component, eventElementTarget, IBranchElement, runBrowser, style } from '@aelea/core'
import { path, router } from '@aelea/router'
import { chain, map, mergeArray, multicast, now } from '@most/core'
import { $column, $Link, $main, $row } from '../common/common'
import { flex, spacing, spacingBig, spacingSmall, theme } from '../common/stylesheet'
import $Calculator from '../components/$Calculator'
import $CountCounters from '../components/$CountCounters'
import $VirtualList from '../components/$QuantumList'
import { ScrollSegment } from '../components/$QuantumScroll'
import $Spring from '../components/$Spring'
import $Table from '../components/$Table'
import { createTodo } from '../components/todo-app/$CreateTodo'
import $TodoApp from '../components/todo-app/$TodoApp'
import { fadeIn } from '../components/transitions/enter'
import $Example from '../components/$Example'


const initialPath = map(location => location.pathname, now(document.location))
const popStateEvent = eventElementTarget('popstate', window)
const locationChange = map(() => document.location.pathname, popStateEvent)

const documentRootPathName = document.querySelector('base')?.href.split(location.origin)[1].substr(1)

if (!documentRootPathName)
  throw `could not find <base href="..."> element to receive root path`


const $Website = component((
  // []: Behavior<NodeChild, any>,
  [sampleLinkClick, routeChanges]: Behavior<string, string>
) => {


  const pathChange = mergeArray([
    initialPath,
    locationChange,
    multicast(routeChanges)
  ])

  const rootRoute = router({ fragment: documentRootPathName, title: 'aelea', pathChange })

  const dragAngDropRoute = rootRoute.create({ fragment: 'drag-and-sort', title: 'Drag N Drop' })
  const todoAppRoute = rootRoute.create({ fragment: 'todo-app', title: 'Todo App' })
  const countCountersRoute = rootRoute.create({ fragment: 'count-counters', title: 'Count Counters' })
  const quantumListRoute = rootRoute.create({ fragment: 'quantum-list', title: 'Quantum List' })
  const calculatorRoute = rootRoute.create({ fragment: 'calculator', title: 'Calculator' })
  const tableRoute = rootRoute.create({ fragment: 'table', title: 'Table' })

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

    path(rootRoute)(


      $row(spacingBig, flex, style({ placeContent: 'center' }))(

        fadeIn(
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
                      })({ orderChange: sampleOrder() })
                    )
                  ]
                })({})

              )({})
            )
          ),

          $container(
            path(tableRoute)(
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


export default $main($Website({}))
