

export default {
  devtool: 'inline-source-map',
  output: {
    filename: 'bundle.js'
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js']
  },
  devServer: {
    publicPath: '/public/'
    // contentBase: './dist'
  },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader', options: { transpileOnly: true } }
    ]
  }
}
