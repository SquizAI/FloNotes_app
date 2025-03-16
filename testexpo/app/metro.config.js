const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'react': path.resolve(__dirname, 'node_modules/react')
};

// Ensure TypeScript files are processed
config.resolver.sourceExts = [
  'js', 'jsx', 'json', 'ts', 'tsx', 'cjs'
];

module.exports = config; 