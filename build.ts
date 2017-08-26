import * as ts from 'typescript'
const { readdirSync } = require('fs')
const { join } = require('path')
import * as ts from 'glob-expand'
const expand = require('glob-expand')




const PATTERNS =
  [
    'src/*/*.ts',
    'src/**/*.ts',
    '!src/*.test.ts',
    '!src/**/*.test.ts'
  ]

export function buildPackage (name: string) {
  console.log(`Compiling ${packageName(name)} with TSC...`)

  const files = expand({ cwd: name, filter: 'isFile' }, PATTERNS).map((file) => join(name, file))

  const COMMONJS_COMPILER_OPTIONS = {
    lib: [
      'dom',
      'es5',
      'es2015'
    ],
    declaration: true,
    moduleResolution: 'node',
    noImplicitAny: true,
    noUnusedParameters: true,
    noUnusedLocals: true,
    sourceMap: true,
    strictNullChecks: true,
    target: 'es5',
    module: 'commonjs',
    outDir: join(name, 'lib')
  }

  const ES2015_COMPILER_OPTIONS =
    Object.assign({}, COMMONJS_COMPILER_OPTIONS, {
      module: 'es2015',
      outDir: join(name, 'lib.es2015')
    })

  compile(files, name, COMMONJS_COMPILER_OPTIONS)
  compile(files, name, ES2015_COMPILER_OPTIONS)
}

function packageName (pkgName: string) {
  const [, name] = pkgName.split('packages/')

  return `@motorcycle/${name}`
}

function compile (files, directory, compilerOptions) {
  const program = ts.createProgram(files, ts.convertCompilerOptionsFromJson(compilerOptions, directory).options)

  const result = program.emit()

  const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics)

  if (diagnostics.length > 0) {
    reportDiagnostics(diagnostics)

    process.exit(1)
  }
}


function reportDiagnostics (diagnostics: ts.Diagnostic[]) {
  diagnostics.forEach(diagnostic => {
    if (diagnostic.file && diagnostic.start) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)

      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    }

  })
}
