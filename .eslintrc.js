module.exports = {
    extends: ['react-app'],
    root: true,
    ignorePatterns: ['src/assets/**/*', '**/build/**/*', '**/dist/**/*'],
    plugins: [
      'simple-import-sort',
      'eslint-plugin-testing-library',
    ],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
      'testing-library/render-result-naming-convention': 'off',
      'eol-last': 'error',
    },
  }
  