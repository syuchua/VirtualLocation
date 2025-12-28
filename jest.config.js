module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo(nent)?|@expo|expo-modules-core|@react-navigation)/)',
  ],
  setupFilesAfterEnv: [],
};
