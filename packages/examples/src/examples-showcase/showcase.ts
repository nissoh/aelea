
import { at, chain, map, mergeArray, multicast, now } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { $node, $text, Behavior, component, eventElementTarget, NodeChild, runAt, style } from 'fufu'
import { path, router } from 'fufu-router'
import { $bodyRoot, $card, $column, $row } from '../common/common'
import { flex, spacingBig } from '../common/stylesheet'
import $Calculator from '../components/$Calculator'
import $CountCounters from '../components/$CountCounters'
import $VirtualList from '../components/$QuantomList'
import $Table from '../components/$Table'
import { createTodo } from '../components/todo-app/$CreateTodo'
import $TodoApp from '../components/todo-app/$TodoApp'
import { $Link } from './common'
import $Example from './$Example'



const initialPath = map(location => location.pathname, now(document.location))
const popStateEvent = eventElementTarget('popstate', window)
const locationChange = map(() => document.location.pathname, popStateEvent)

const $PanningUI = component((
  []: Behavior<NodeChild, any>,
  [sampleLinkClick, routeChanges]: Behavior<NodeChild, string>
) => {

  const routeChange = mergeArray([
    initialPath,
    locationChange,
    multicast(routeChanges)
  ])

  const rootRoute = router(routeChange)


  const todoAppRoute = rootRoute.create('todo-app')
  const countCountersRoute = rootRoute.create('count-counters')
  const quantomListRoute = rootRoute.create('quantom-list')
  const calculatorRoute = rootRoute.create('calculator')
  const tableRoute = rootRoute.create('table')


  const $container = $row(
    flex,
    style({ minHeight: '100vh', scrollSnapAlign: 'start' })
  )


  const $table = $Table<{ id: string }>({
    maxContainerHeight: 400,
    queryItemsOp: map(position => {

      const totalItems = 1e6

      const segment = position.to - position.from;
      const arr = Array(segment)
      const $items = arr.fill(null).map((x, i) => {
        const id = totalItems - (position.to - i) + 1

        return {
          id: 'item-#' + id
        }
      })

      return at(1300, { totalItems, data: $items })
    }),
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
  })({})


  return [

    path(rootRoute)(
      $row(spacingBig)(

        $node(style({ placeContent: 'center', width: '220px' }))(
          $card(style({ position: 'fixed', placeContent: 'center', height: '100vh' }))(
            $text('Fufu Functional'),

            $text('Examples'),

            $column(
              $Link({ $content: $text('Table'), href: '/table' })({
                click: sampleLinkClick()
              }),

              $Link({ $content: $text('Calculator'), href: '/calculator' })({
                click: sampleLinkClick()
              }),

              $Link({ $content: $text('Quantom List'), href: '/quantom-list' })({
                click: sampleLinkClick()
              }),

              $Link({ $content: $text('Count Counters'), href: '/count-counters' })({
                click: sampleLinkClick()
              }),

              $Link({ $content: $text('Todo App'), href: '/todo-app' })({
                click: sampleLinkClick()
              }),
            )
          )
        ),


        $column(flex)(

          $container(
            path(tableRoute)(
              $Example(
                $table
              )({})
            )
          ),

          $container(
            path(calculatorRoute)(
              $Example(
                $Calculator({})
              )({})
            )
          ),

          $container(
            path(quantomListRoute)(
              $Example(
                $VirtualList({})
              )({})
            )
          ),

          $container(
            path(countCountersRoute)(
              $Example(
                $CountCounters({})
              )({})
            )
          ),

          $container(
            path(todoAppRoute)(
              $Example(
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


runAt(
  $bodyRoot(style({ scrollSnapType: 'y mandatory', overflow: 'auto' }))(
    $PanningUI({})
  ),
  newDefaultScheduler()
)


