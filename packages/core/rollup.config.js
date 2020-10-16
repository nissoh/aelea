
import resolve from '@rollup/plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'
import * as pkg from './package.json'


const deps = Object.keys(pkg.dependencies)


export default {
  input: `src/index.ts`,
  output: [
    {
      file: pkg.main,
      format: 'umd',
      name: pkg.name,
      sourcemap: true,
      globals: deps
    },
    {
      file: pkg.module,
      format: 'esm',
      sourcemap: true
    }
  ],
  external: deps,
  plugins: [
    resolve(),
    typescript({
      useTsconfigDeclarationDir: true,
      clean: true
    }),
  ]
}
