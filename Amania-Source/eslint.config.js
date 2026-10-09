const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['android/**', 'node_modules/**'],
  },
  {
    files: ['server/**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
]);
