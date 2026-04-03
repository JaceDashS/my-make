const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src-web/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist-electron', 'renderer'),
    filename: 'bundle.js',
    clean: true,
  },
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'src-web/rn-compat/index.tsx'),
      'react-native/Libraries/Utilities/Platform': path.resolve(
        __dirname,
        'src-web/rn-compat/index.tsx',
      ),
      'react-native-safe-area-context': path.resolve(
        __dirname,
        'src-web/rn-compat/index.tsx',
      ),
      '@react-native-clipboard/clipboard': path.resolve(
        __dirname,
        'src-web/lib/rn-clipboard-shim.ts',
      ),
      'react-native-windows': path.resolve(
        __dirname,
        'src-web/rn-compat/index.tsx',
      ),
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.electron.json'),
            // webpackがバンドルを担当するためトランスパイルのみ実行する
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'electron', 'index.html'),
    }),
  ],
  devServer: {
    port: 3001,
    hot: true,
    open: false,
  },
};
