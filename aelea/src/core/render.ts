import { branch } from './combinator/branch.js'
import { createDomScheduler } from './scheduler.js'
import { stream } from './stream.js'
import type { I$Node, I$Scheduler, INode, INodeElement } from './types.js'
import { SettableDisposable } from './utils/SettableDisposable.js'

export interface IRunEnvironment {
  cache: string[]
  namespace: string
  stylesheet: CSSStyleSheet
  error(error: unknown): void
  scheduler?: I$Scheduler
}

export type IUserRunEnvironment = {
  rootAttachment: INodeElement
  $rootNode: I$Node
  onError(error: unknown): void
} & Partial<IRunEnvironment>

export function render(userConfig: IUserRunEnvironment) {
  if (!userConfig.rootAttachment) {
    throw new Error('rootAttachment is required for $createRoot')
  }

  const rootNode: INode = {
    element: userConfig.rootAttachment,
    $segments: [],
    disposable: new SettableDisposable(),
    styleBehavior: [],
    insertAscending: true,
    attributesBehavior: [],
    stylePseudo: []
  }

  const onError = userConfig.onError
    ? userConfig.onError
    : (error: Error) => {
        console.error('An error occurred in the render environment:', error)
      }

  const config: IRunEnvironment = {
    scheduler: userConfig.scheduler ?? createDomScheduler(),
    namespace: userConfig.namespace ?? '•',
    stylesheet: new CSSStyleSheet(),
    cache: [],
    error: onError
  }

  document.adoptedStyleSheets = [...document.adoptedStyleSheets, config.stylesheet]

  return stream((sink, scheduler) => {
    const newLocal = branch(config, rootNode, 0, [0])
    return newLocal
  })
}
