import { defineConfig } from 'eslint/config';
import tsdocPlugin from 'eslint-plugin-tsdoc';
import prettierPlugin from 'eslint-plugin-prettier';

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default defineConfig([
    {
        ignores: ['local', 'dist']
    },
    eslint.configs.recommended,
    tseslint.configs.eslintRecommended,
    tseslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            tsdoc: tsdocPlugin,
            prettier: prettierPlugin
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true,
            }
        },
        rules: {
            'lines-between-class-members': ['error', 'always'],
            '@typescript-eslint/no-explicit-any': [0],
            '@typescript-eslint/ban-ts-ignore': [0],
            '@typescript-eslint/no-use-before-define': [0],
            'no-console': 'error',
            'tsdoc/syntax': 'error',
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                    arrowParens: 'avoid'
                }
            ]
        }
    }
]);
/*
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.eslint.json'
    },
    plugins: ['@typescript-eslint', 'eslint-plugin-tsdoc', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier',
        'plugin:prettier/recommended'
    ],
*/
