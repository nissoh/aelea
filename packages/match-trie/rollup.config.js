// const resolve = require('rollup-plugin-node-resolve')
// const commonjs = require('rollup-plugin-commonjs')
// const sourceMaps = require('rollup-plugin-sourcemaps')

import resolve from 'rollup-plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'
import * as pkg from './package.json'
import { rollup } from 'rollup'

// import copy from 'rollup-plugin-copy-assets'



const globals = {
  '@most/core': 'mostCore',
  '@most/scheduler': 'mostScheduler',
  '@most/disposable': 'mostDisposable',
  '@most/prelude': 'mostPrelude'
}

const pkgOutput = {
  name: pkg.name,
  sourcemap: true,
  globals
}

const compilerOptions = {
  input: `src/index.ts`,
  output: [  // (amd, cjs, esm, iife, umd)
    { ...pkgOutput, file: pkg.module,  format: 'esm' },
    { ...pkgOutput, file: pkg.main,    format: 'cjs' },
    { ...pkgOutput, file: pkg.browser, format: 'umd' }
  ],
  external: Object.keys(global),
  plugins: [
    resolve(),
    typescript({ typescript: require('typescript'), check: false, useTsconfigDeclarationDir: true })
  ]
}

export default compilerOptions
