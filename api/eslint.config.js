import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest
            },
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        rules: {
            'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }]
        }
    }
];