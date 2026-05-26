const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname)
config.resolver.blockList = /node_modules[\\/]react-native-css-interop[\\/]\.cache($|[\\/].*)/

module.exports = withNativeWind(config, { input: './global.css' })
