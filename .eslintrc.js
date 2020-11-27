module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json'
    },
    plugins: ['@typescript-eslint', 'eslint-plugin-tsdoc', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier/@typescript-eslint',
        'prettier',
        'plugin:prettier/recommended'
    ],
    rules: {
        'lines-between-class-members': ['error', 'always'],
        '@typescript-eslint/no-explicit-any': [0],
        '@typescript-eslint/ban-ts-ignore': [0],
        '@typescript-eslint/no-use-before-define': [0],
        'no-console': 'error',
        'tsdoc/syntax': 'error',
        'prettier/prettier': ['error', {
            'endOfLine': 'auto',
            'arrowParens': 'avoid'
        }]
    }
};
