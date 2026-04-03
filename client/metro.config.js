const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const fs = require('fs');
const path = require('node:path');

let rnwPath = null;

try {
  rnwPath = fs.realpathSync(
    path.resolve(require.resolve('react-native-windows/package.json'), '..'),
  );
} catch {
  // react-native-windows is optional in this workspace.
}

//

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */

const config = {
  //
  resolver: {
    blockList: [
      // This stops "npx @react-native-community/cli run-windows" from causing the metro server to crash if its already running
      new RegExp(
        `${path.resolve(__dirname, 'windows').replace(/[/\\]/g, '/')}.*`,
      ),
      /.*\.ProjectImports\.zip/,
      ...(rnwPath
        ? [
            // This prevents "npx @react-native-community/cli run-windows" from hitting:
            // EBUSY: resource busy or locked for files produced by msbuild.
            new RegExp(`${rnwPath}/build/.*`),
            new RegExp(`${rnwPath}/target/.*`),
          ]
        : []),
    ],
    //
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
