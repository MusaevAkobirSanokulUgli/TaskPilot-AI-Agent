const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Use polling watcher to avoid EMFILE error on systems without watchman
config.watcher = {
  ...config.watcher,
  watchman: {
    deferStates: [],
  },
  // Fall back to polling if FSEvent fails
  additionalExts: config.watcher?.additionalExts || [],
};

module.exports = config;
