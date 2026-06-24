module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NOTE: The react-native-reanimated/plugin is NO LONGER needed in SDK 54
    // with Reanimated v4. babel-preset-expo handles it automatically.
    // Remove it to avoid build errors.
    plugins: [],
  };
};