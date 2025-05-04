import { map, merge, switchLatest } from '@most/core'
import type { Stream } from '@most/types'
import type { IBehavior } from '../../core/combinator/behavior.js'
import { $node, component, nodeEvent } from '../../core/index.js'
import type { I$Node } from '../../core/source/node.js'

export interface Tab {
  content: I$Node
  head: I$Node
}

export interface Tabs {
  selected: Stream<Tab>
  tabs: Tab[]
}

export const $Tabs = (config: Tabs) => {
  return component(([clickTab, clickTabTether]: IBehavior<any, Tab>) => {
    return [
      merge(
        $node(
          ...config.tabs.map((t) => {
            return clickTabTether(
              nodeEvent('click'),
              map((_clickEvent) => {
                return t
              })
            )(t.head)
          })
        ),
        switchLatest(map((tab) => tab.content, config.selected))
      ),

      { clickTab }
    ]
  })
}
