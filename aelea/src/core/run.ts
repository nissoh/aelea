import { map, mergeArray, scan, tap } from '@most/core'
import { disposeAll, disposeNone, disposeWith } from '@most/disposable'
import { newDefaultScheduler } from '@most/scheduler'
import type { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'
import { nullSink } from './common.js'
import type {
  IBranchElement,
  INode,
  INodeElement} from './types.js'
import type { $Branch } from './source/node.js'
import type { $Node } from './source/node.js'
import type { IAttrProperties } from './combinator/attribute.js'
import type { IStyleCSS } from './combinator/style.js'
import type { IBranch } from './source/node.js'
import { SettableDisposable } from './utils/SettableDisposable.js'
import { useStylePseudoRule, useStyleRule } from './utils/styleUtils.js'
import type { IStyleEnvironment } from './combinator/style.js'

export interface IRunEnvironment {
  rootNode: IBranchElement
  style: IStyleEnvironment
  scheduler: Scheduler
}
export function runBrowser(config: Partial<IRunEnvironment> = {}) {
  const composedConfig: IRunEnvironment = {
    style: {
      namespace: '•',
      stylesheet: new CSSStyleSheet(),
      cache: []
    },
    rootNode: document.body,
    scheduler: newDefaultScheduler(),
    ...config
  }

  document.adoptedStyleSheets = [...document.adoptedStyleSheets, composedConfig.style.stylesheet]

  const rootNode: IBranch = {
    element: composedConfig.rootNode,
    $segments: [],
    disposable: new SettableDisposable(),
    styleBehavior: [],
    insertAscending: true,
    attributesBehavior: [],
    stylePseudo: []
  }

  return ($root: $Branch) => {
    const s = new BranchEffectsSink(composedConfig, rootNode, 0, [0])

    map((node) => ({ ...node, segmentPosition: 0 }), $root).run(s, composedConfig.scheduler)
  }
}

class BranchEffectsSink implements Sink<IBranch | INode> {
  disposables: Disposable[] = []

  segmentsSlotsMap: Map<IBranch | INode, Disposable>[] = []

  constructor(
    private env: IRunEnvironment,
    private parentNode: IBranch,
    private segmentPosition: number,
    private segmentsCount: number[]
  ) {}

  event(_: Time, node: INode | IBranch) {
    try {
      node?.disposable.set(
        disposeWith((node) => {
          this.segmentsCount[this.segmentPosition]--
          node.element.remove()
          const slot = this.segmentsSlotsMap[this.segmentPosition]
          const disposableBranch = slot.get(node)
          slot.delete(node)
          disposableBranch?.dispose()
        }, node)
      )
    } catch {
      console.error(node.element.nodeName)
      throw new Error('Cannot append node that have already been rendered, check invalid node operations under ^')
    }

    let slot = 0

    for (let sIdx = 0; sIdx < this.segmentPosition; sIdx++) {
      slot += this.segmentsCount[sIdx]
    }

    const insertAt = this.parentNode.insertAscending ? slot : slot + this.segmentsCount[this.segmentPosition]

    appendToSlot(this.parentNode.element, node.element, insertAt)

    this.segmentsCount[this.segmentPosition]++

    if ('style' in node && node.style && Object.keys(node.style).length) {
      const selector = useStyleRule(this.env.style, node.style)
      node.element.classList.add(selector)
    }

    if ('stylePseudo' in node) {
      for (const styleDeclaration of node.stylePseudo) {
        const selector = useStylePseudoRule(this.env.style, styleDeclaration.style, styleDeclaration.class)
        node.element.classList.add(selector)
      }
    }

    if ('attributes' in node && node.attributes) {
      if (Object.keys(node.attributes).length !== 0) {
        applyAttrFn(node.attributes, node.element)
      }
    }

    if ('styleBehavior' in node && node.styleBehavior) {
      const disposeStyle = mergeArray(node.styleBehavior.map((sb) => styleBehavior(sb, node, this.env.style))).run(
        nullSink,
        this.env.scheduler
      )

      this.disposables.push(disposeStyle)
    }

    if ('attributesBehavior' in node && node.attributesBehavior) {
      const disposeStyle = mergeArray(
        node.attributesBehavior.map((attrs) => {
          return tap((attr) => {
            applyAttrFn(attr, node.element)
          }, attrs)
        })
      ).run(nullSink, this.env.scheduler)

      this.disposables.push(disposeStyle)
    }

    const newDisp = '$segments' in node ? new BranchChildrenSinkList(node.$segments, this.env, node) : disposeNone()

    if (!this.segmentsSlotsMap[this.segmentPosition]) {
      this.segmentsSlotsMap[this.segmentPosition] = new Map()
    }

    this.segmentsSlotsMap[this.segmentPosition].set(node, disposeAll([...this.disposables, newDisp]))
  }

  end(_t: Time) {
    for (const s of this.segmentsSlotsMap) {
      if (s) {
        for (const d of s.values()) {
          d.dispose()
        }
      }
    }
  }

  error(_: Time, err: Error) {
    console.error(err)
  }
}

class BranchChildrenSinkList implements Disposable {
  disposables = new Map<$Node<INodeElement>, Disposable>()

  constructor(
    $segments: $Node<INodeElement>[],
    private env: IRunEnvironment,
    private node: IBranch
  ) {
    const l = $segments.length
    const segmentsCount = new Array(l).fill(0)

    for (let i = 0; i < l; ++i) {
      const $child = $segments[i]
      const sink = new BranchEffectsSink(this.env, node, i, segmentsCount)

      this.disposables.set($child, $child.run(sink, this.env.scheduler))
    }
  }

  dispose(): void {
    for (const d of this.disposables.values()) {
      d.dispose()
    }
  }
}

function styleBehavior(styleBehavior: Stream<IStyleCSS | null>, node: IBranch, cacheService: IStyleEnvironment) {
  let latestClass: string

  return scan(
    (previousCssRule: null | ReturnType<typeof useStyleRule>, styleObject) => {
      if (previousCssRule) {
        if (styleObject === null) {
          node.element.classList.remove(previousCssRule)

          return ''
        }

        const cashedCssClas = useStyleRule(cacheService, styleObject)

        if (previousCssRule !== cashedCssClas) {
          node.element.classList.replace(latestClass, cashedCssClas)
          latestClass = cashedCssClas

          return cashedCssClas
        }
      }

      if (styleObject) {
        const cashedCssClas = useStyleRule(cacheService, styleObject)

        node.element.classList.add(cashedCssClas)
        latestClass = cashedCssClas

        return cashedCssClas
      }

      return ''
    },
    null,
    styleBehavior
  )
}

function applyAttrFn(attrs: IAttrProperties<unknown>, node: IBranchElement) {
  if (attrs) {
    for (const [attrKey, value] of Object.entries(attrs)) {
      if (value === undefined || value === null) {
        node.removeAttribute(attrKey)
      } else {
        node.setAttribute(attrKey, String(value))
      }
    }
  }

  return node
}

function appendToSlot(parent: IBranchElement, child: INodeElement, insertAt: number) {
  if (insertAt === 0) return parent.prepend(child)

  parent.insertBefore(child, parent.children[insertAt])
}
