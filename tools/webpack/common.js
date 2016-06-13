const webpack = require('webpack')
const ForkCheckerPlugin = require('awesome-typescript-loader').ForkCheckerPlugin
const path = require('path')


module.exports = {
  // root: path.resolve(__dirname),
  output: {
    path: path.resolve('./dist'),
    publicPath : '/',
    filename: "[name].js"
  },
  resolve: {
    // root: __dirname,
    extensions: ['', '.ts', '.js', '.html']
  },

  // Colored terminal output
  stats: {
    colors: true
  },

  /**
   * Static analysis linter for TypeScript advanced options configuration
   * Description: An extensible linter for the TypeScript language.
   *
   * See: https://github.com/wbuchwalter/tslint-loader
   */
  tslint: {
    emitErrors: false,
    failOnHint: false
  },

  plugins: [
    /*
     * Plugin: ForkCheckerPlugin
     * Description: Do type checking in a separate process, so webpack don't need to wait.
     *
     * See: https://github.com/s-panferov/awesome-typescript-loader#forkchecker-boolean-defaultfalse
     */
    new ForkCheckerPlugin(),

    /*
     * Plugin: OccurenceOrderPlugin
     * Description: Varies the distribution of the ids to get the smallest id length
     * for often used ids.
     *
     * See: https://webpack.github.io/docs/list-of-plugins.html#occurrenceorderplugin
     * See: https://github.com/webpack/docs/wiki/optimization#minimize
     */
    new webpack.optimize.OccurrenceOrderPlugin(true)
  ],
  module: {
    preLoaders: [

      /*
       * Tslint loader support for *.ts files
       *
       * See: https://github.com/wbuchwalter/tslint-loader
       */
      { test: /\.ts$/, loader: 'tslint-loader' },

      /*
       * Source map loader support for *.js files
       * Extracts SourceMaps for source files that as added as sourceMappingURL comment.
       *
       * See: https://github.com/webpack/source-map-loader
       */
      {
        test: /\.js$/,
        loader: 'source-map-loader'
      }

    ],

    loaders: [
      /*
       * SVG sprite loader for Webpack
       *
       * See: https://github.com/kisenka/svg-sprite-loader
       */
      {
        test: /\.svg$/,
        loader: 'svg-sprite?' + JSON.stringify({
          name: '[name]', // '[name]_[hash]'
          prefixize: true
        })
      },
      /*
       * Typescript loader support for .ts and Angular 2 async routes via .async.ts
       *
       * See: https://github.com/s-panferov/awesome-typescript-loader
       */
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
        exclude: [/\.(spec|e2e)\.ts$/]
      }
    ]
  }
}
