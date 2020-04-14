const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = (env, argv) => {
    const prod = argv.mode === 'production';

    return {
        entry: ['./index.js', './src/scss/app.scss'],
        externals: [nodeExternals()],
        watchOptions: {
            aggregateTimeout: 300,
            poll: true,
        },
        output: {
            filename: '[name].bundle.js',
            path: __dirname + '/dist',
            publicPath: '/',
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                    },
                },
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
                {
                    test: /\.(png|jpg|gif|svg)$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'url-loader',
                            options: {
                                limit: 8192,
                                name: '[name].[ext]',
                                publicPath: '/images/',
                                emitFile: false,
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({
                filename: '[name].bundle.css',
            }),
        ],
        devtool: 'source-map',
    };
};
