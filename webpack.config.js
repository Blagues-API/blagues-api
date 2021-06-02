const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = (env, argv) => {
  const prod = argv.mode === 'production';

  return {
    entry: ['./src/scss/app.scss'],
    watchOptions: {
      aggregateTimeout: 300,
      poll: true,
    },
    output: {
      path: path.join(__dirname, './build'),
      publicPath: '/files/',
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: !prod,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: !prod,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'style.css',
      }),
    ],
    devtool: 'source-map',
  };
};
