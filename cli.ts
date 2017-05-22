import { FuseBox, WebIndexPlugin, TypeScriptHelpers, UglifyJSPlugin } from 'fuse-box'
import { command, app, flag, alias, withPromise, run, withCallback } from 'reginn'
import { createReadStream, createWriteStream } from 'fs'
import { ServerOptions } from 'fuse-box/dist/typings/devServer/Server'

const isProduction = process.argv.indexOf('--production') > -1

// Create FuseBox Instance
const fuseBox = FuseBox.init({
  homeDir: 'packages',
  sourceMaps: { project: true, vendor: true },
  cache: false,
  output: '.dist/$name.js',
  plugins: [
    WebIndexPlugin({ title: 'Dev', template: 'packages/examples/index.html' }),
    TypeScriptHelpers(),
    isProduction && UglifyJSPlugin()
  ]
})

const serverOptions: ServerOptions = { port: 8080 }

const bundle = (root: string) => {
  fuseBox
    .bundle('bundle')
    .instructions(`> ${root}`)
    // .watch('packages/**')
    .watch()
  fuseBox.dev({ ...serverOptions })

  return fuseBox.run()
}

// const bundle = (entry: string) =>
//     fuseBox.dev(`> ${entry}`, { port: 8080 })

const inputFlag = flag('string', alias('path', 'p'))
const logcmd = command(alias('example'), inputFlag)

withPromise(logcmd).then(({ args, options }) => {
  return bundle(options.path)
})

run(logcmd)
