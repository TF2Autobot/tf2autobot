import { defineConfig } from 'eslint/config';
import tsdocPlugin from 'eslint-plugin-tsdoc';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default defineConfig([
    {
        ignores: ['local', 'dist', 'eslint.config.mjs', '.prettierrc.js']
    },
    eslint.configs.recommended,
    //tseslint.configs.eslintRecommended,
    tseslint.configs.recommendedTypeChecked,
    {
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            tsdoc: tsdocPlugin,
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            }
        },
        rules: {
            'lines-between-class-members': ['error', 'always'],
            '@typescript-eslint/no-explicit-any': [0],
            '@typescript-eslint/ban-ts-ignore': [0],
            '@typescript-eslint/no-use-before-define': [0],
            '@typescript-eslint/prefer-promise-reject-errors': 'off',
            '@typescript-eslint/no-unsafe-enum-comparison': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'no-console': 'error',
            'tsdoc/syntax': 'error',
            '@typescript-eslint/no-duplicate-enum-values': "off",
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                    arrowParens: 'avoid'
                }
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_$',
                    argsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        }
    },
    eslintPluginPrettierRecommended
]);
