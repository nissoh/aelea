// modified from https://github.com/codesandbox/codesandbox-client/blob/master/packages/app/src/embed/components/Content/Monaco/workers/fetch-dependency-typings.js


import type * as monaco from 'monaco-editor'
import { fetchJson } from '../../common/utils'


const ROOT_URL = `https://cdn.jsdelivr.net/`



interface JSDelivrFlat {
  files: JSDelivrMeta[],
  default: string
}

interface JSDelivrMeta {
  hash: string
  name: string
  size: number
  time: string
}

const fetchCache = new Map()

// function resolveAppropiateFile(fileMetaData, relativePath: string) {
//   const absolutePath = `/${relativePath}`

//   return fileMetaData[`${absolutePath}.d.ts`]
//     ? `${relativePath}.d.ts` : fileMetaData[`${absolutePath}.ts`]
//       ? `${relativePath}.ts` : fileMetaData[absolutePath] ?? fileMetaData[`${absolutePath}/index.d.ts`]
//         ? `${relativePath}/index.d.ts` : relativePath

// }

// const getFileTypes = (depUrl: string, dependency: string, depPath: string, fetchedPaths: Array<string>, fileMetaData) => {
//   const virtualPath = path.join('node_modules', dependency, depPath)

//   if (fetchedPaths[virtualPath]) return null

//   return fetch(`${depUrl}/${depPath}`).then(typings => {
//     if (fetchedPaths[virtualPath]) return null

//     // addLib(virtualPath, typings, fetchedPaths)

//     // Now find all require statements, so we can download those types too
//     return Promise.all(
//       getDependancyRefs(depPath, typings)
//         .filter(
//           // Don't add global deps
//           dep => dep.startsWith('.')
//         )
//         .map(relativePath => path.join(path.dirname(depPath), relativePath))
//         .map(relativePath => resolveAppropiateFile(fileMetaData, relativePath))
//         .map(nextDepPath =>
//           getFileTypes(depUrl, dependency, nextDepPath, fetchedPaths, fileMetaData)
//         )
//     )
//   })
// }



// const getDependancyRefs = (title: string, file: string) => {
//   const requires = []

//   const sourceFile = self.ts.createSourceFile(
//     title,
//     file,
//     self.ts.ScriptTarget.Latest,
//     true,
//     self.ts.ScriptKind.TS
//   )

//   self.ts.forEachChild(sourceFile, node => {
//     switch (node.kind) {
//     case self.ts.SyntaxKind.ImportDeclaration: {
//       requires.push(node.moduleSpecifier.text)
//       break
//     }
//     case self.ts.SyntaxKind.ExportDeclaration: {
//       // For syntax 'export ... from '...'''
//       if (node.moduleSpecifier) {
//         requires.push(node.moduleSpecifier.text)
//       }
//       break
//     }
//     default: {
//       /* */
//     }
//     }
//   })

//   return requires
// }


export async function fetchFromMeta(tsService: monaco.languages.typescript.LanguageServiceDefaults, dependency: string, version: string): Promise<string> {
  const meta = (await fetchMeta(dependency, version)).files

  let dtsFiles: string[] = meta.filter(metaFile => /\.d\.ts$/.test(metaFile.name)).map(m => m.name)

  if (dtsFiles.length === 0) {
    // if no .d.ts files found, fallback to .ts files
    dtsFiles = meta.filter(metaFile => /\.ts$/.test(metaFile.name)).map(m => m.name)
  }

  if (dtsFiles.length === 0) {
    throw new Error('No inline typings found.')
  }

  const dtsQueries = dtsFiles.map(async (file: string): Promise<string> => {
    const dtsContent: string = await fetch(`https://cdn.jsdelivr.net/npm/${dependency}@${version}${file}`).then(r => r.text())

    return dtsContent // [dtsContent, `${dependency}${file}`]
  })

  const dtss = await Promise.all(dtsQueries)

  tsService.addExtraLib(`declare module '${dependency}' { ${dtss.join('\n')} }'`)

  return dtss.join('\n')
}

// async function fetchFromTypings(dependency: string, version: string) {
//   const depUrl = `${ROOT_URL}npm/${dependency}@${version}`
//   const packageJSON: {
//     typings: string
//     types: string
//   } = await fetchJson(`${depUrl}/package.json`)

//   const declaredTypesPath = (packageJSON.typings || packageJSON.types).replace(/^(\/|\.\/)/, '') // trim possible trailing path

//   if (declaredTypesPath) {
//     // get all files in the specified directory
//     const fileData = getFileMetaData(dependency, version, declaredTypesPath)

//     return getFileTypes(depUrl, dependency, resolveAppropiateFile(fileData, declaredTypesPath), fetchedPaths, fileData)
//   }

//   throw new Error('No typings field in package.json')
// }

const fetchMeta = (dependency: string, version: string): Promise<JSDelivrFlat> =>
  fetchJson(`https://data.jsdelivr.com/v1/package/npm/${dependency}@${version}/flat`)

const getFileMetaData = async (dependency: string, version: string, depPath: string) =>
  (await fetchMeta(dependency, version)).files.filter(f => f.name.startsWith(depPath))



// async function fetchAndAddDependencies(dependencies: { name: string, version: string }[]) {
//   const fetchedPaths = {}
//   const depNames = dependencies.map(d => d.name)

//   await Promise.all(
//     depNames.map(async dep => {
//       try {
//         if (!loadedTypings.includes(dep)) {
//           loadedTypings.push(dep)

//           const depVersion = await doFetch(
//             `https://data.jsdelivr.com/v1/package/resolve/npm/${dep}@${dependencies[dep]}`
//           )
//             .then(x => JSON.parse(x))
//             .then(x => x.version)
//           // eslint-disable-next-line no-await-in-loop
//           await fetchFromTypings(dep, depVersion, fetchedPaths).catch(() =>
//             // not available in package.json, try checking meta for inline .d.ts files
//             fetchFromMeta(dep, depVersion, fetchedPaths).catch(() =>
//               // Not available in package.json or inline from meta, try checking in @types/
//               fetchFromDefinitelyTyped(dep, depVersion, fetchedPaths)
//             )
//           )
//         }
//       } catch (e) {
//         // Don't show these cryptic messages to users, because this is not vital
//         if (process.env.NODE_ENV === 'development') {
//           console.error(`Couldn't find typings for ${dep}`, e)
//         }
//       }
//     })
//   )

// }