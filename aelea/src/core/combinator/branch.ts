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
} from '../../stream/index.js'
import type { IAttributeProperties } from '../combinator/attribute.js'
import type { IStyleCSS } from '../combinator/style.js'
import type { IRunEnvironment } from '../render.js'
import { stream } from '../stream.js'
import type { I$Scheduler, I$Slottable, INode, INodeElement, ISlottable } from '../types.js'

export function branch(env: IRunEnvironment, branchNode: INode, segmentPosition: number, segmentsSlotCount: number[]) {
  return stream((sink, scheduler) => {
    return new BranchEffectsSink(sink, scheduler, env, branchNode, segmentPosition, segmentsSlotCount)
  })
}

class BranchEffectsSink implements ISink<INode | ISlottable>, Disposable {
  disposables: Disposable[] = []

  segmentsSlotList: Map<INode | ISlottable, Disposable>[] = []

  constructor(
    readonly sink: ISink<unknown>,
    readonly scheduler: I$Scheduler,
    private readonly env: IRunEnvironment,
    private readonly branchNode: INode,
    private readonly segmentPosition: number,
    private readonly segmentsSlotCount: number[]
  ) {}

  event(childNode: INode) {
    try {
      childNode.disposable.set(
        disposeWith(nodeToRemove => {
          this.segmentsSlotCount[this.segmentPosition]--
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

    if (typeof childNode.styleBehavior === 'object') {
      const newLocal = childNode.styleBehavior.map(sb => styleBehavior(sb, childNode, this.env))
      const disposeStyle = merge(...newLocal).run(nullSink, this.scheduler)

      this.disposables.push(disposeStyle)
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
      ).run(nullSink, this.scheduler)

      this.disposables.push(disposeStyle)
    }

    let slot = 0
    for (let sIdx = 0; sIdx < this.segmentPosition; sIdx++) {
      slot += this.segmentsSlotCount[sIdx]
    }

    const insertAt = this.branchNode.insertAscending ? slot : slot + this.segmentsSlotCount[this.segmentPosition]

    this.segmentsSlotCount[this.segmentPosition]++

    appendToSlot(this.branchNode.element, childNode.element, insertAt)

    const newDisp =
      '$segments' in childNode
        ? new BranchChildrenSinkList(this.sink, this.scheduler, this.env, childNode)
        : disposeNone

    if (!this.segmentsSlotList[this.segmentPosition]) {
      this.segmentsSlotList[this.segmentPosition] = new Map()
    }

    this.segmentsSlotList[this.segmentPosition].set(childNode, disposeAll([...this.disposables, newDisp]))
  }

  end() {
    for (const s of this.segmentsSlotList) {
      for (const d of s.values()) {
        d[Symbol.dispose]()
      }
    }
  }

  error(err: Error) {
    console.error(err)
  }

  [Symbol.dispose](): void {
    for (const d of this.disposables) {
      d[Symbol.dispose]()
    }

    for (const s of this.segmentsSlotList) {
      for (const d of s.values()) {
        d[Symbol.dispose]()
      }
    }

    this.segmentsSlotList = []
  }
}

class BranchChildrenSinkList implements Disposable {
  disposables = new Map<I$Slottable, Disposable>()

  constructor(
    private readonly sink: ISink<INode | ISlottable>,
    private readonly scheduler: I$Scheduler,
    private env: IRunEnvironment,
    private node: INode
  ) {
    const l = node.$segments.length
    const segmentsCount = new Array(l).fill(0)

    for (let i = 0; i < l; ++i) {
      const $child = node.$segments[i]
      const sink = new BranchEffectsSink(this.sink, this.scheduler, this.env, this.node, i, segmentsCount)

      this.disposables.set($child, $child.run(sink, this.scheduler))
    }
  }

  [Symbol.dispose](): void {
    for (const d of this.disposables.values()) d[Symbol.dispose]()
  }
}

function styleBehavior(styleBehavior: IStream<IStyleCSS | null>, node: INode, cacheService: IRunEnvironment) {
  let latestClass = ''

  return op(
    styleBehavior,
    aggregate((previousCssRule: null | ReturnType<typeof useStyleRule>, styleObject) => {
      if (previousCssRule) {
        if (styleObject === null) {
          node.element.classList.remove(previousCssRule)
          latestClass = ''
          return ''
        }

        const cashedCssClas = useStyleRule(cacheService, styleObject)

        if (previousCssRule !== cashedCssClas) {
          node.element.classList.replace(previousCssRule, cashedCssClas)
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

function useStyleRule(env: IRunEnvironment, styleDefinition: IStyleCSS) {
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

function useStylePseudoRule(env: IRunEnvironment, styleDefinition: IStyleCSS, pseudo = '') {
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
