import { FuseBox, Sparky } from 'fuse-box'
import * as path from 'path'
import * as ss from 'serve-static'

const entry = process.argv.slice(3)[0]

export const initFuse = (isProduction = false) => FuseBox.init({
  homeDir: 'src',
  cache: false,
  output: '.dist/static/$name.js',
  plugins: [
    // isProduction ? QuantumPlugin({ removeExportsInterop: false, uglify: false }) : {}
  ],
  sourceMaps: !isProduction && {
    project: true
  },
  hash: isProduction
})

Sparky.task('dev', () => {
  const fsbx = initFuse()

  fsbx
    .bundle('bundle')
    .instructions(`> ${entry}`)
    .watch()

  fsbx.dev({ root: false }, server => {
    const dist = path.resolve('./.dist')
    const app = server.httpServer.app


    app.use('/', ss(path.join(dist, 'static')))
    app.get('*', function (req: any, res: any) {
      res.sendFile(path.join(path.resolve('./'), 'index.html'))
    })
  })

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

