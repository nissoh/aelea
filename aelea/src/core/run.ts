import { map, mergeArray, scan, tap } from '@most/core'
import { disposeAll, disposeNone, disposeWith } from '@most/disposable'
import { newDefaultScheduler } from '@most/scheduler'
import type { Disposable, Scheduler, Sink, Stream, Time } from '@most/types'
import type { IAttributeProperties } from './combinator/attribute.js'
import type { IStyleCSS } from './combinator/style.js'
import { nullSink } from './common.js'
import type { I$Node, I$Slottable, INode, INodeElement, ISlottable } from './source/node.js'
import { SettableDisposable } from './utils/SettableDisposable.js'

export interface IRunEnvironment {}

export interface IRunEnvironment {
  $rootNode: I$Node
  scheduler: Scheduler
  rootAttachment?: INodeElement
  cache: string[]
  namespace: string
  stylesheet: CSSStyleSheet
}

class BranchEffectsSink implements Sink<INode | ISlottable> {
  disposables: Disposable[] = []

  segmentsSlotList: Map<INode | ISlottable, Disposable>[] = []

  constructor(
    private readonly env: IRunEnvironment,
    private readonly branchNode: INode,
    private readonly segmentPosition: number,
    private readonly segmentsCount: number[]
  ) {}

  event(_: Time, childNode: INode) {
    try {
      childNode.disposable.set(
        disposeWith((nodeToRemove) => {
          this.segmentsCount[this.segmentPosition]--
          nodeToRemove.element.remove()
          const slot = this.segmentsSlotList[this.segmentPosition]
          const disposableBranch = slot.get(nodeToRemove)
          slot.delete(nodeToRemove)
          disposableBranch?.dispose()
        }, childNode)
      )
    } catch {
      console.error(childNode.element.nodeName)
      throw new Error('Cannot append node that have already been rendered, check invalid node operations under ^')
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

    if (typeof childNode.styleBehavior === 'object') {
      const disposeStyle = mergeArray(childNode.styleBehavior.map((sb) => styleBehavior(sb, childNode, this.env))).run(
        nullSink,
        this.env.scheduler
      )

      this.disposables.push(disposeStyle)
    }

    if (typeof childNode.attributesBehavior === 'object') {
      const disposeStyle = mergeArray(
        childNode.attributesBehavior.map((attrs) => {
          return tap((attr) => {
            applyAttributes(attr, childNode.element)
          }, attrs)
        })
      ).run(nullSink, this.env.scheduler)

      this.disposables.push(disposeStyle)
    }

    let slot = 0
    for (let sIdx = 0; sIdx < this.segmentPosition; sIdx++) {
      slot += this.segmentsCount[sIdx]
    }

    const insertAt = this.branchNode.insertAscending ? slot : slot + this.segmentsCount[this.segmentPosition]

    this.segmentsCount[this.segmentPosition]++

    appendToSlot(this.branchNode.element, childNode.element, insertAt)

    const newDisp = '$segments' in childNode ? new BranchChildrenSinkList(this.env, childNode) : disposeNone()

    if (!this.segmentsSlotList[this.segmentPosition]) {
      this.segmentsSlotList[this.segmentPosition] = new Map()
    }

    this.segmentsSlotList[this.segmentPosition].set(childNode, disposeAll([...this.disposables, newDisp]))
  }

  end(_t: Time) {
    for (const s of this.segmentsSlotList) {
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
  disposables = new Map<I$Slottable, Disposable>()

  constructor(
    private env: IRunEnvironment,
    private node: INode
  ) {
    const l = node.$segments.length
    const segmentsCount = new Array(l).fill(0)

    for (let i = 0; i < l; ++i) {
      const $child = node.$segments[i]
      const sink = new BranchEffectsSink(this.env, this.node, i, segmentsCount)

      this.disposables.set($child, $child.run(sink, this.env.scheduler))
    }
  }

  dispose(): void {
    for (const d of this.disposables.values()) {
      d.dispose()
    }
  }
}

export function runBrowser(userConfig: Partial<IRunEnvironment> & { $rootNode: I$Node }): Disposable {
  const defaultConfig: Omit<IRunEnvironment, '$rootNode'> = {
    namespace: '•',
    stylesheet: new CSSStyleSheet(),
    cache: [],
    rootAttachment: document.querySelector('html')!,
    scheduler: newDefaultScheduler()
  }

  const config = { ...defaultConfig, ...userConfig }

  document.adoptedStyleSheets = [...document.adoptedStyleSheets, config.stylesheet]

  const $rootNode = config.$rootNode

  return map((node) => {
    const rootNode: INode = {
      element: defaultConfig.rootAttachment!,
      $segments: [],
      disposable: new SettableDisposable(),
      styleBehavior: [],
      insertAscending: true,
      attributesBehavior: [],
      stylePseudo: []
    }

    // TODO(Fix) BranchEffectsSink will prepend the rootNode to the configred rootAttachment which is not always the desired use case
    return new BranchEffectsSink(config, rootNode, 0, [0]).event(0, node)
  }, $rootNode).run(nullSink as any, config.scheduler)
}

function styleBehavior(styleBehavior: Stream<IStyleCSS | null>, node: INode, cacheService: IRunEnvironment) {
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
