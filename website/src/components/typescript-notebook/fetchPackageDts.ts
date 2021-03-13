
import { fetchJson } from '../../common/utils'
import type * as monaco from 'monaco-editor'


interface JSDelivrFlat {
  files: JSDelivrMeta[]
  default: string
}

interface JSDelivrMeta {
  hash: string
  name: string
  size: number
  time: string
}

type PackageFile = {
  content: string
} & JSDelivrMeta


type PackageJsonDependencies = { [version: string]: string }




export type Package = {
  name: string
  version: string
  typings?: string
  files: PackageFile[]
}

export type PackageJson = {
  name: string
  version: string
  typings?: string
  files: PackageFile[]
  dependencies: PackageJsonDependencies
} & Package

export type PackageTree = {
  dependencies: PackageTree[]
} & Package


const fetchMeta = (dependency: string, version: string): Promise<JSDelivrFlat> =>
  fetchJson(`https://data.jsdelivr.com/v1/package/npm/${dependency}@${version}/flat`)



const packageQueryCache = new Map<string, Promise<PackageJson>>()
const packageLocalCache = new Map<string, PackageJson>()

async function cacheGet(key: string, queryStore: () => Promise<PackageJson>): Promise<PackageJson> {
  const locallyStoredItem = packageLocalCache.get(key)

  if (locallyStoredItem)
    return locallyStoredItem

  const storedItem = localStorage.getItem(key)

  if (storedItem) {
    const parsedItem: PackageJson = JSON.parse(storedItem)
    packageLocalCache.set(key, parsedItem)
    return parsedItem
  }

  const pendingQuery = packageQueryCache.get(key)

  if (pendingQuery)
    return pendingQuery

  const query = queryStore()

  packageQueryCache.set(key, query)

  const resp = await query

  packageLocalCache.set(key, resp)
  localStorage.setItem(key, JSON.stringify(resp))

  return resp
}

export async function fetchFileListContent(name: string, version = 'latest') {
  const meta = (await fetchMeta(name, version)).files

  let dtsFiles: JSDelivrMeta[] = meta.filter(metaFile => /\.d\.ts$/.test(metaFile.name))

  if (dtsFiles.length === 0) {
    // if no .d.ts files found, fallback to .ts files
    dtsFiles = meta.filter(metaFile => /\.ts$/.test(metaFile.name))
  }

  if (dtsFiles.length === 0) {
    throw new Error('No inline typings found.')
  }

  const dtsQueries = dtsFiles.map(async (file): Promise<PackageFile> => {
    const content: string = await fetch(`https://cdn.jsdelivr.net/npm/${name}@${version}${file.name}`).then(r => r.text())

    return { ...file, content: content.replace(/(} from '@)/g, `} from '%40`) }
  })

  return Promise.all(dtsQueries)
}

export async function fetchAndCacheDependancyTree(name: string, version = 'latest'): Promise<PackageTree> {
  const pkgPath = `https://cdn.jsdelivr.net/npm/${name}@${version}/package.json`

  const pkg = await cacheGet(pkgPath, async () => {
    const pkgJson: { dependencies: PackageJsonDependencies, typings?: string, types?: string } = await fetchJson(pkgPath)
    const dependencies = pkgJson?.dependencies ?? {}
    const files = await fetchFileListContent(name, version)
    const typings = pkgJson.typings ?? pkgJson.types

    return { files, dependencies, name, version, typings }
  })

  const depsQueries = Object.entries(pkg.dependencies).map(([pkgName, version]) =>
    fetchAndCacheDependancyTree(pkgName, version.replace(/[\^*]/, ''))
  )

  const dependencies = await Promise.all(depsQueries)

  return { ...pkg, dependencies }
}

export function defineModel(pkg: PackageTree, monacoGlobal: typeof monaco) {
  const pkgModelUri = monacoGlobal.Uri.parse(`file://root/node_modules/${pkg.name}/package.json`)
  const model = monacoGlobal.editor.getModel(pkgModelUri)

  if (!model) {
    const dependencies = Object.entries(pkg.dependencies).reduce(((acc, [key, val]) => ({ ...acc, [key.replace(/^@/, `%40`)]: val })), {}) // https://github.com/microsoft/monaco-editor/issues/1306
    const pakgDefJsonStr = JSON.stringify({
      name: pkg.name,
      version: pkg.version,
      typings: pkg.typings,
      dependencies
    })
    monacoGlobal.editor.createModel(pakgDefJsonStr, "typescript", pkgModelUri);

    pkg.files.forEach(file => {
      monacoGlobal.editor.createModel(file.content, "typescript", monacoGlobal.Uri.parse(`file://root/node_modules/${pkg.name}${file.name}`));
    })
  }
}

export function definePackageTree(pkg: PackageTree, monacoGlobal: typeof monaco) {
  defineModel(pkg, monacoGlobal)
  pkg.dependencies.forEach(pkg => {
    definePackageTree(pkg, monacoGlobal)
  })
}
