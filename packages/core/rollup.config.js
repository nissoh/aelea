
import resolve from 'rollup-plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'
import * as pkg from './package.json'


const packages = {
  '@most/core': 'mostCore',
  '@most/scheduler': 'mostScheduler',
  '@most/disposable': 'mostDisposable',
  '@most/prelude': 'mostPrelude'
}


export default {
  input: `src/index.ts`,
  output: [
    {
      file: pkg.main,
      format: 'umd',
      name: pkg.name,
      sourcemap: true,
      globals: packages
    },
    {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    }
  ],
  external: Object.keys(packages),
  plugins: [
    resolve(),
    typescript({
      typescript: require('typescript'),
      check: true,
      useTsconfigDeclarationDir: true
    }),
    // sourceMaps()
  ]
}
