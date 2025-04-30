
import { awaitPromises, chain, map, now } from '@most/core'
import { $node, $text, component, style } from 'aelea/dom'
import { $column, $row, spacing } from 'aelea/ui-components'
import $Example from '../../components/$Example'
import { $Link } from '../../components/$Link'
import { fadeIn } from '../../components/transitions/enter'
import { pallete } from '../../theme'
import $Calculator from './calculator/$Calculator'
import $CountCounters from './count-counters/$CountCounters'
import $DragList from './dragList/$DragList'
import { $PopoverExample } from './overlay/$PopoverExample'
import { $TableExample } from './table/$TableExample'
import { $Theme } from './theme/$Theme'
import { createTodo } from './todo-app/$CreateTodo'
import $TodoApp from './todo-app/$TodoApp'
import { $VirtualScrollExample } from './virtual-scroll/$VirtualScrollExample'
import { match, type Route } from 'aelea/router'
import type { Behavior } from 'aelea/core'




interface Website {
  router: Route
}

export default ({ router }: Website) => component((
  [routeChanges, linkClickTether]: Behavior<string, string>
) => {

  const dragAngDropRoute = router.create({ fragment: 'drag-and-sort', title: 'Drag N Drop' })
  const todoAppRoute = router.create({ fragment: 'todo-app', title: 'Todo App' })
  const countCountersRoute = router.create({ fragment: 'count-counters', title: 'Count Counters' })
  const virtualScrollRoute = router.create({ fragment: 'virtual-scroll', title: 'Virtual Scroll' })
  const calculatorRoute = router.create({ fragment: 'calculator', title: 'Calculator' })
  const tableRoute = router.create({ fragment: 'table', title: 'Table' })
  // const autocompleteRoute = router.create({ fragment: 'autocomplete', title: 'Autocomplete' })
  const popoverRoute = router.create({ fragment: 'popover', title: 'Popover' })
  const themeRoute = router.create({ fragment: 'theme', title: 'Theme' })
  const ethSendRoute = router.create({ fragment: 'ethereum-metamask', title: 'Send Ethereum' })




  return [

    $row(spacing.big, style({ placeContent: 'center', flex: 1 }))(

      fadeIn(
        $column(spacing.default, style({ top: '10vh', placeContent: 'center flex-start' }))(

          $column(spacing.big, style({ whiteSpace: 'nowrap' }))(
            $column(spacing.tiny)(
              $text(style({ color: pallete.foreground, fontSize: '75%' }))('Demos'),
              $Link({ $content: $text('Theme'), url: '/p/examples/theme', route: themeRoute })({
                click: linkClickTether()
              }),
              $Link({ $content: $text('Metamask Gate'), url: '/p/examples/ethereum-metamask', route: ethSendRoute })({
                click: linkClickTether()
              }),
              $Link({ $content: $text('Drag And Sort'), url: '/p/examples/drag-and-sort', route: dragAngDropRoute })({
                click: linkClickTether()
              }),
              $Link({ $content: $text('Count Counters'), url: '/p/examples/count-counters', route: countCountersRoute })({
                click: linkClickTether()
              }),
              $Link({ $content: $text('Todo App'), url: '/p/examples/todo-app', route: todoAppRoute })({
                click: linkClickTether()
              }),
              $Link({ $content: $text('Calculator'), url: '/p/examples/calculator', route: calculatorRoute })({
                click: linkClickTether()
              }),
            ),

            $column(spacing.tiny)(
              $text(style({ color: pallete.foreground, fontSize: '75%' }))('UI Components'),
              // $Link({ $content: $text('Autocomplete'), url: '/p/examples/autocomplete', route: autocompleteRoute })({
              //   click: sampleLinkClick()
              // }),
              $Link({ $content: $text('Virtual Scroll'), url: '/p/examples/virtual-scroll', route: virtualScrollRoute })({
                click: linkClickTether()
              }),
              $Link({ $content: $text('Popover'), url: '/p/examples/popover', route: popoverRoute })({
                click: linkClickTether()
              }),
              $Link({ $content: $text('Table'), url: '/p/examples/table', route: tableRoute })({
                click: linkClickTether()
              }),
            ),
          )

        )
      ),

      $node(),

      $column(style({ flex: 2 }))(

        match(themeRoute)(
          $Example({ file: 'src/components/$Table.ts' })(
            $column(
              $Theme({})
            )
          )({})
        ),

        match(ethSendRoute)(
          $Example({ file: 'src/components/$Table.ts' })(
            $column(
              chain(mod => mod.$EtherSwapExample({}), awaitPromises(map(_ => import('./ethSwap/$MetamaskSend'), now(null))))
            )
          )({})
        ),


        match(dragAngDropRoute)(
          $Example({ file: 'src/components/$DragSort.ts' })(
            $DragList({})
          )({})
        ),

        // $container(
        //   match(autocompleteRoute)(
        //     $Example({ file: 'src/components/$DragSort.ts' })(
        //       $AutocompleteExample({})
        //     )({})
        //   )
        // ),

        match(popoverRoute)(
          $Example({ file: 'src/components/$DragSort.ts' })(
            $PopoverExample({})
          )({})
        ),

        match(tableRoute)(
          $Example({ file: 'src/components/$Table.ts' })(
            $column(
              $TableExample({})
            )
          )({})
        ),

        match(calculatorRoute)(
          $Example({ file: 'src/components/$Calculator.ts' })(
            $Calculator({})
          )({})
        ),

        match(virtualScrollRoute)(
          $Example({ file: 'src/components/$QuantumList.ts' })(
            $VirtualScrollExample({})
          )({})
        ),

        match(countCountersRoute)(
          $Example({ file: 'src/components/$CountCounters.ts' })(
            $CountCounters({})
          )({})
        ),

        match(todoAppRoute)(
          $Example({ file: 'src/components/todo-app/$TodoApp.ts' })(
            $TodoApp(
              Array(1e2).fill(null).map((x, i) => createTodo('t-' + (i + 1)))
            )({})
          )({})
        ),

      )

    ),


    {
      routeChanges
    }

  ]
})


