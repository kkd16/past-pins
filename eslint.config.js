const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['.expo/**', 'dist/**', 'coverage/**', 'expo-env.d.ts'],
  },
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/\\S/]',
          message: 'Put visible text in src/localization/locales and use t().',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(accessibilityLabel|accessibilityHint|placeholder|title|label)$/] > Literal[value=/.+/]',
          message:
            'Translate user-facing text and accessibility labels with t().',
        },
      ],
    },
  },
]);
