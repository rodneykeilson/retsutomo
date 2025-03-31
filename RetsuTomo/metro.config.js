const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// metro.config.js
const {
    wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const config = {
    // Your existing Metro configuration options
};

module.exports = wrapWithReanimatedMetroConfig(mergeConfig(getDefaultConfig(__dirname), config));

