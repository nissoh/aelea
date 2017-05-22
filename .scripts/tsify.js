
// const fsbx = require("fuse-box");
// var budo = require('budo')

// rimraf('build', () => {
//   fs.mkdir('build', () => bundle())
// })

// let fuseBox = new fsbx.FuseBox({
//     homeDir: "src/",
//     sourceMap: {
//         bundleReference: "sourcemaps.js.map",
//         outFile: "./build/sourcemaps.js.map",
//     },
//     cache: true,
//     outFile: "./build/out.js",
//     plugins: [fsbx.TypeScriptHelpers, fsbx.JSONPlugin]
// });


// budo('./src/index.js', {
//   live: true,             // setup live reload
//   port: 8000,             // use this port
//   browserify: {
//     transform: build   // ES6
//   }
// }).on('connect', function (ev) {
//   console.log('Server running on %s', ev.uri)
//   console.log('LiveReload running on port %s', ev.livePort)
// }).on('update', function (buffer) {
//   console.log('bundle - %d bytes', buffer.length)
// })

// module.exports = bundle