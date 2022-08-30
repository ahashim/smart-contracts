module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ['chai-friendly', '@typescript-eslint'],
  extends: [
    'standard',
    'plugin:chai-friendly/recommended',
    'plugin:prettier/recommended',
    'plugin:node/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'node/no-missing-import': [
      'error',
      {
        tryExtensions: ['.js', '.json', '.node', '.ts', '.d.ts'],
      },
    ],
    'node/no-unpublished-import': 'off',
    'node/no-unsupported-features/es-syntax': [
      'error',
      { ignores: ['modules'] },
    ],
  },
};
