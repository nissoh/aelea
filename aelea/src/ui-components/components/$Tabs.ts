import { map, merge, switchLatest } from '@most/core'
import type { Stream } from '@most/types'
import type { Behavior } from '../../core/types.js'
import { $node, component, nodeEvent } from '../../dom/index.js'
import type { $Node } from '../../dom/types.js'

export interface Tab {
  content: $Node
  head: $Node
}

export interface Tabs {
  selected: Stream<Tab>
  tabs: Tab[]
}

export const $Tabs = (config: Tabs) => {
  return component(([clickTab, clickTabTether]: Behavior<any, Tab>) => {
    return [
      merge(
        $node(
          ...config.tabs.map((t) => {
            return clickTabTether(
              nodeEvent('click'),
              map((_clickEvent) => {
                return t
              }),
            )(t.head)
          }),
        ),
        switchLatest(map((tab) => tab.content, config.selected)),
      ),

      { clickTab },
    ]
  })
}
