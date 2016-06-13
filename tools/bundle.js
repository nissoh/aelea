var webpack = require('webpack')
const webpackConfig = require('./webpack/prod');

/**
 * Creates application bundles from the source files.
 */
webpack(webpackConfig).run((err, stats) => {
  if (err) {
    throw new Error(err)
  }

  console.log(stats.toString({colors: true}))
})

