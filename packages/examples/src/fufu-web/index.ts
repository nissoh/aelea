
import { chain, constant, map, multicast, switchLatest } from '@most/core';
import { newDefaultScheduler } from '@most/scheduler';
import { $ChildNode, $text, Behavior, component, ContainerDomNode, event, O, runAt, style } from 'fufu';
import { $bodyRoot, $card, $column, $row, $seperator } from '../common/common';
import { flex, spacingBig } from '../common/stylesheet';
import $Button from '../components/form/$Button';



interface NodeModel {
  name: string,
  composition: any[],
  children: any[]
}


let id = 0
const defaultProps: Omit<NodeModel, 'name'> = {
  composition: [],
  children: []
}
const $ChildNodeView = (model: Omit<NodeModel, 'composition' | 'children'>) => component((
  [sampleClick, click]: Behavior<ContainerDomNode, PointerEvent>
) => {

  const props: NodeModel = { ...defaultProps, ...model }

  const clickBehavior = sampleClick(
    event('pointerdown')
  );

  return [
    $text(clickBehavior)(props.name),

    {
      select: constant(model, click)
    }
  ]
})


const $Awake = component((
  [sampleComposition, composition]: Behavior<PointerEvent, $ChildNode>,
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
              );
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



runAt(
  $bodyRoot(
    $Awake({})
  ),
  newDefaultScheduler()
)


