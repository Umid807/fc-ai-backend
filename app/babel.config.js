module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.svg'],
          alias: {
            '@assets': './assets',
            '@components': './components',
            '@screens': './screens',
            '@data': './assets/data',
          },
        },
      ],
      'react-native-reanimated/plugin', // this MUST be last
    ],
  };
};
