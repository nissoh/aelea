import {
  aggregate,
  disposeAll,
  disposeNone,
  disposeWith,
  type ISink,
  type IStream,
  merge,
  nullSink,
  op,
  tap
} from '../stream/index.js'
import type { IAttributeProperties } from './combinator/attribute.js'
import type { IStyleCSS } from './combinator/style.js'
import { createDomScheduler } from './scheduler.js'
import type { I$Node, I$Scheduler, I$Slottable, INode, INodeElement, ISlottable } from './types.js'
import { SettableDisposable } from './utils/SettableDisposable.js'

export interface IRunEnvironment {
  $rootNode: I$Node
  scheduler: I$Scheduler
  cache: string[]
  namespace: string
  stylesheet: CSSStyleSheet
  rootAttachment?: INodeElement
}

class BranchEffectsSink implements ISink<INode | ISlottable> {
  segmentsSlotList: Map<INode | ISlottable, Disposable>[] = []

  constructor(
    readonly env: IRunEnvironment,
    readonly branchNode: INode,
    readonly segmentPosition: number,
    readonly segmentsCount: number[]
  ) {}

  event(childNode: INode) {
    try {
      childNode.disposable.set(
        disposeWith(nodeToRemove => {
          this.segmentsCount[this.segmentPosition]--
          nodeToRemove.element.remove()
          const slot = this.segmentsSlotList[this.segmentPosition]
          const disposableBranch = slot.get(nodeToRemove)
          slot.delete(nodeToRemove)
          disposableBranch?.[Symbol.dispose]()
        }, childNode)
      )
    } catch (error) {
      console.error('Failed to set disposable for node:', childNode.element.nodeName, error)
      throw new Error('Cannot append node that have already been rendered, check invalid node operations')
    }

    if (typeof childNode.style === 'object') {
      const selector = useStyleRule(this.env, childNode.style)
      childNode.element.classList.add(selector)
    }

    if (typeof childNode.stylePseudo === 'object') {
      for (const styleDeclaration of childNode.stylePseudo) {
        const selector = useStylePseudoRule(this.env, styleDeclaration.style, styleDeclaration.class)
        childNode.element.classList.add(selector)
      }
    }

    if (typeof childNode.attributes === 'object') {
      if (Object.keys(childNode.attributes).length !== 0) {
        applyAttributes(childNode.attributes, childNode.element)
      }
    }

    // Collect disposables for this specific child node
    const childDisposables: Disposable[] = []

    if (typeof childNode.styleBehavior === 'object') {
      const newLocal = childNode.styleBehavior.map(sb => styleBehavior(sb, childNode, this.env))
      const disposeStyle = merge(...newLocal).run(nullSink, this.env.scheduler)

      childDisposables.push(disposeStyle)
    }

    if (typeof childNode.attributesBehavior === 'object') {
      const disposeStyle = merge(
        ...childNode.attributesBehavior.map(attrs => {
          return op(
            attrs,
            tap(attr => {
              applyAttributes(attr, childNode.element)
            })
          )
        })
      ).run(nullSink, this.env.scheduler)

      childDisposables.push(disposeStyle)
    }

    let slot = 0
    for (let sIdx = 0; sIdx < this.segmentPosition; sIdx++) {
      slot += this.segmentsCount[sIdx]
    }

    const insertAt = this.branchNode.insertAscending ? slot : slot + this.segmentsCount[this.segmentPosition]

    this.segmentsCount[this.segmentPosition]++

    appendToSlot(this.branchNode.element, childNode.element, insertAt)

    const newDisp = '$segments' in childNode ? new BranchChildrenSinkList(this.env, childNode) : disposeNone

    if (!this.segmentsSlotList[this.segmentPosition]) {
      this.segmentsSlotList[this.segmentPosition] = new Map()
    }

    this.segmentsSlotList[this.segmentPosition].set(childNode, disposeAll([...childDisposables, newDisp]))
  }

  end() {
    // // Dispose all segment disposables
    // for (const s of this.segmentsSlotList) {
    //   for (const d of s.values()) {
    //     d[Symbol.dispose]()
    //   }
    //   s.clear() // Clear the map to release references
    // }
    // // Clear arrays to release references
    // this.segmentsSlotList.length = 0
  }

  error(err: Error) {
    console.error(err)
  }
}

class BranchChildrenSinkList implements Disposable {
  disposables = new Map<I$Slottable, Disposable>()

  constructor(
    readonly env: IRunEnvironment,
    readonly node: INode
  ) {
    const l = node.$segments.length
    const segmentsCount = new Array(l).fill(0)

    for (let i = 0; i < l; ++i) {
      const $child = node.$segments[i]
      const sink = new BranchEffectsSink(this.env, this.node, i, segmentsCount)

      this.disposables.set($child, $child.run(sink, this.env.scheduler))
    }
  }

  [Symbol.dispose](): void {
    for (const d of this.disposables.values()) d[Symbol.dispose]()
    this.disposables.clear() // Clear the map to release references
  }
}

function styleBehavior(styleBehavior: IStream<IStyleCSS | null>, node: INode, cacheService: IRunEnvironment) {
  return op(
    styleBehavior,
    aggregate((previousCssRule: null | ReturnType<typeof useStyleRule>, styleObject) => {
      if (previousCssRule) {
        if (styleObject === null) {
          node.element.classList.remove(previousCssRule)
          return ''
        }

        const cashedCssClas = useStyleRule(cacheService, styleObject)

        if (previousCssRule !== cashedCssClas) {
          node.element.classList.replace(previousCssRule, cashedCssClas)
          return cashedCssClas
        }
      }

      if (styleObject) {
        const cashedCssClas = useStyleRule(cacheService, styleObject)

        node.element.classList.add(cashedCssClas)
        return cashedCssClas
      }

      return ''
    }, null)
  )
}

function styleObjectAsString(styleObj: IStyleCSS) {
  return Object.entries(styleObj)
    .map(([key, val]) => {
      const kebabCaseKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      return `${kebabCaseKey}:${val};`
    })
    .join('')
}

export function useStyleRule(env: IRunEnvironment, styleDefinition: IStyleCSS) {
  const properties = styleObjectAsString(styleDefinition)
  const cachedRuleIdx = env.cache.indexOf(properties)

  if (cachedRuleIdx === -1) {
    const index = env.stylesheet.cssRules.length
    const namespace = env.namespace + index

    env.cache.push(properties)
    env.stylesheet.insertRule(`.${namespace} {${properties}}`, index)
    return `${env.namespace + index}`
  }

  return `${env.namespace + cachedRuleIdx}`
}

export function useStylePseudoRule(env: IRunEnvironment, styleDefinition: IStyleCSS, pseudo = '') {
  const properties = styleObjectAsString(styleDefinition)
  const index = env.stylesheet.cssRules.length
  const rule = `.${env.namespace + index + pseudo} {${properties}}`
  const cachedRuleIdx = env.cache.indexOf(rule)

  if (cachedRuleIdx === -1) {
    env.cache.push(rule)
    env.stylesheet.insertRule(rule, index)
    return `${env.namespace + index}`
  }

  return `${env.namespace + cachedRuleIdx}`
}

function applyAttributes(attrs: IAttributeProperties<unknown>, node: INodeElement) {
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

function appendToSlot(parent: INodeElement, child: INodeElement, insertAt: number) {
  if (insertAt === 0) return parent.prepend(child)

  parent.insertBefore(child, parent.children[insertAt])
}

export function render(config: {
  rootAttachment: INodeElement
  $rootNode: I$Node
  scheduler?: I$Scheduler
  namespace?: string
  cache?: string[]
}): Disposable {
  if (!config.rootAttachment) {
    throw new Error('rootAttachment is required for render')
  }

  const env: IRunEnvironment = {
    $rootNode: config.$rootNode,
    scheduler: config.scheduler ?? createDomScheduler(),
    rootAttachment: config.rootAttachment,
    cache: config.cache ?? [],
    namespace: config.namespace ?? 'Ω',
    stylesheet: new CSSStyleSheet()
  }

  // Add stylesheet to document
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, env.stylesheet]

  const rootNode: INode = {
    element: config.rootAttachment,
    $segments: [config.$rootNode],
    disposable: new SettableDisposable(),
    styleBehavior: [],
    insertAscending: true,
    attributesBehavior: [],
    stylePseudo: []
  }

  const rootSink = new BranchChildrenSinkList(env, rootNode)

  // Return a disposable that cleans up both the sink and the stylesheet
  return {
    [Symbol.dispose](): void {
      rootSink[Symbol.dispose]()
      // Remove the stylesheet from the document
      const index = document.adoptedStyleSheets.indexOf(env.stylesheet)
      if (index !== -1) {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(sheet => sheet !== env.stylesheet)
      }
    }
  }
}
