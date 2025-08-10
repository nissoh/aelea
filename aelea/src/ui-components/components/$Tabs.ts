import { type IBehavior, type IStream, map, merge, switchLatest } from '../../stream/index.js'
import { $node, component, nodeEvent } from '../../ui/index.js'
import type { I$Slottable } from '../../ui/types.js'

export interface Tab {
  content: I$Slottable
  head: I$Slottable
}

export interface Tabs {
  selected: IStream<Tab>
  tabs: Tab[]
}

export const $Tabs = (config: Tabs) => {
  return component(([clickTab, clickTabTether]: IBehavior<any, Tab>) => {
    return [
      merge(
        $node(
          ...config.tabs.map(t => {
            return clickTabTether(
              nodeEvent('click'),
              map(_clickEvent => {
                return t
              })
            )(t.head)
          })
        ),
        switchLatest(map((tab: Tab) => tab.content)(config.selected))
      ),

      { clickTab }
    ]
  })
}
