import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
    // Lint the TypeScript sources, never the compiled output
    globalIgnores(['dist/**', 'build/**', 'coverage/**', 'function.zip']),
    {
        files: ['**/*.ts'],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node
        },
        rules: {
            // console.info is the operational log level (CloudWatch INFO); console.log is for debugging only
            'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'error'
        }
    },
    {
        files: ['**/*.js'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node
        }
    }
);
