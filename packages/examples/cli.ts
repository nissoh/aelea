import {
  FuseBox,
  QuantumPlugin,
  WebIndexPlugin,
  Sparky
} from 'fuse-box'

const path = process.argv.slice(3)[0]

export const initFuse = (isProduction = false) => FuseBox.init({
  homeDir: 'src',
  cache: false,
  output: '.dist/$name.js',
  plugins: [
    WebIndexPlugin({ title: 'Dev', template: './index.html' }),
    isProduction ? QuantumPlugin({ removeExportsInterop: false, uglify: false }) : {}
  ],
  sourceMaps: !isProduction && {
    project: true
  } ,
  hash: isProduction
})

Sparky.task('dev', () => {
  const fsbx = initFuse()

  fsbx
    .bundle('bundle')
    .instructions(`> ${path}`)
    .watch()

  fsbx.dev()

  return fsbx.run()
})

Sparky.task('dist', ['clean'], () => {
  const fsbx = initFuse(true)

  fsbx
    .bundle('bundle')
    .instructions(`> ${path}`)
    .watch()

  // fsbx.dev({ port: 8080 })

  return fsbx.run()
})

Sparky.task('clean', () => Sparky.src('.dist/').clean('.dist/'))

