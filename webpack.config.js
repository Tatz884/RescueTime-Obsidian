const path = require('path');

module.exports = {
    entry: './main.ts',  // Entry point of your application
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'main.js',
        path: __dirname,
        libraryTarget: "commonjs2"
    },
    externals: {
        obsidian: 'commonjs2 obsidian'
    }
};