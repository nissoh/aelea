const webpack = require('webpack');
const path = require('path');
const webpackMerge = require('webpack-merge'); // used to merge webpack configs
const webpackCommon = require('./common');
const del = require('del');

del.sync(['./dist']);

module.exports =  webpackMerge(webpackCommon, {
  entry: {
    main: [
      './src/index'
    ]
  },

  devtool: 'eval-source-map',

  /**
   * Switch loaders to debug mode.
   *
   * See: http://webpack.github.io/docs/configuration.html#debug
   */
  debug: true
})
