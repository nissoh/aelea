const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  mode: "development",
  output: {
    path: __dirname + '/dist',
    filename: "[name].js"
  },
  watch: false,
  context: __dirname, // to automatically find tsconfig.json
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            "transpileOnly": true, // Set to true if you are using fork-ts-checker-webpack-plugin
            "projectReferences": true
          }
        }
      }
    ]
  },
  resolve: {
    modules: [
      "node_modules",
      path.resolve(__dirname)
    ],
    extensions: [".ts", '.js'],
    plugins: [
      new TsconfigPathsPlugin({})
    ]
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ],
  devServer: {
    port: 3000,
    historyApiFallback: {
      disableDotRule: true
    }
  }
}