import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
const browsersync = require('rollup-plugin-browsersync')

import typescript from 'rollup-plugin-typescript2'



export default {
  // input: `src/index.ts`,
  output: [
    {
      file: 'dist/bundle.js',
      name: 'demo',
      format: 'iife', // (amd, cjs, esm, iife, umd)
      sourcemap: true
    }
  ],
  external: ['radixdlt'],
  // sourcemap: true,
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  // watch: {
  //   include: ['src/**']
  // },
  plugins: [
    // includePaths({
    //   include: {
    //     radixdlt: 'node_modules/radixdlt/build/browser/radixdlt.js',
    //     external: [ 'radixdlt' ],
    //     extensions: ['.js', '.json', '.html']
    //   }
    // }),
    // Compile TypeScript files
    typescript({ typescript: require('typescript'), check: false }),
    // Resolve source maps to the original source
    // sourceMaps(),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    resolve({
      // preferBuiltins: false
      // module: true
      // modulesOnly: true,
      // browser: true
      // modulesOnly: true
      // only: [ 'radixdlt']
    }),


    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    // builtins({ crypto: true }),

    // json(),


    browsersync({
      open: true,
      single: true,
      serveStatic: ['./'],
      // proxy: "localhost:4700"
    })
  ]
}
