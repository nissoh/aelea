import { map, merge, switchLatest } from "@most/core"
import { $node, $Node, component, nodeEvent } from '@aelea/dom'
import { Behavior } from '@aelea/core'
import { Stream } from "@most/types"


export interface Tab {
  content: $Node
  head: $Node
}

export interface Tabs {
  selected: Stream<Tab>
  tabs: Tab[]
}


export const $Tabs = (config: Tabs) => {
  return component((
    [clickTab, clickTabTether]: Behavior<any, Tab>
  ) => {


    return [
      merge(
        $node(
          ...config.tabs.map(t => {
            return clickTabTether(
              nodeEvent('click'),
              map(clickEvent => {
                return t
              })
            )(t.head)
          })
        ),
        switchLatest(
          map(tab => tab.content, config.selected)
        ),
      ),

      { clickTab }
    ]

  })

}
