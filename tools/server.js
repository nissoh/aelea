const path = require('path');
const express = require('express');

const webpack = require('webpack');
const webpackConfig = require('./webpack/dev');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const historyApiFallback = require('connect-history-api-fallback');

const port = 9000;

const app = express();

const compiler = webpack(webpackConfig);

app.use(historyApiFallback({
  verbose: false
}));

app.use(webpackMiddleware(compiler, {
  publicPath: webpackConfig.output.publicPath,
  contentBase: '/',
  // hot: true,
  quiet: false,
  noInfo: false,
  lazy: false,
  stats: {
    colors: true
  }
}));


app.use(webpackHotMiddleware(compiler));


app.listen(port, '0.0.0.0', (err) => {
  if (err) console.log(err);

  console.info('==>  Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', port, port);
});

