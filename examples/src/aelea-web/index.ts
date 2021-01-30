
import { chain, constant, map, multicast, switchLatest } from '@most/core'
import { newDefaultScheduler } from '@most/scheduler'
import { $Node, $text, Behavior, component, event, O, style, IBranch, nullSink } from '@aelea/core'
import { $main, $card, $column, $row, $seperator } from '../common/common'
import { flex, spacingBig } from '../common/stylesheet'
import $Button from '../components/form/$Button'


interface NodeModel {
  name: string
  composition: unknown[]
  children: unknown[]
}


let id = 0
const defaultConfig: Omit<NodeModel, 'name'> = {
  composition: [],
  children: []
}

const $ChildNodeView = (model: Omit<NodeModel, 'composition' | 'children'>) => component((
  [sampleClick, click]: Behavior<IBranch, PointerEvent>
) => {

  const config: NodeModel = { ...defaultConfig, ...model }

  const clickBehavior = sampleClick(
    event('pointerdown')
  )

  return [
    $text(clickBehavior)(config.name),

    {
      select: constant(model, click)
    }
  ]
})


const $Awake = component((
  [sampleComposition, composition]: Behavior<PointerEvent, $Node>,
  [sampleNodeSelection, nodeSelection]: Behavior<NodeModel, NodeModel>
) => {


  const mulicatedcomposition = multicast(
    map(() => {
      return $ChildNodeView({ name: 'aa ' + ++id })
    }, composition)
  )

  const paneStyle = O(
    spacingBig,
    style({ width: '350px' })
  )

  return [
    $row(style({ gap: '24px' }), flex)(

      $card(paneStyle)(

        $column(flex)(
          $text('Assets'),
        ),

        style({ margin: '0 -16px' }, $seperator),

        $column(flex)(
          $row(
            $text(flex)('Tree'),
            $Button({ $content: $text('+') })({
              click: sampleComposition()
            })
          ),
          $column(flex)(
            chain(nodeComposeFn => {
              return $column(
                nodeComposeFn({
                  select: sampleNodeSelection()
                })
              )
            }, mulicatedcomposition)
          )
        ),
      ),

      $column(flex)(
        chain(nodeComposeFn => {
          return $column(
            nodeComposeFn({
              select: sampleNodeSelection()
            })
          )
        }, mulicatedcomposition)
      ),

      $card(paneStyle)(
        $column(flex)(
          $text('Styles'),
          // $Button({ $content: $text('+ Style') })({
          //   click: sampleStyle()
          // }),

          switchLatest(
            map(selectedNode => {
              return $text(selectedNode?.name || 'none')
            }, nodeSelection)
          )
        ),
      )

    )
  ]
})



$main(
  $Awake({})
).run(nullSink, newDefaultScheduler())


