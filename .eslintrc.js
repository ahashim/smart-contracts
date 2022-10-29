module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: [
    'chai-friendly',
    'simple-import-sort',
    'sonarjs',
    '@typescript-eslint',
  ],
  extends: [
    'standard',
    'plugin:chai-friendly/recommended',
    'plugin:node/recommended',
    'plugin:prettier/recommended',
    'plugin:sonarjs/recommended',
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
    'no-unused-vars': 'off', // prefer tyepscript rules
    '@typescript-eslint/no-unused-vars': 'error',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
  },
};
