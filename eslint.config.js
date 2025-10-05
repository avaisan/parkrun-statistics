import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/cdk.out/**', 'eslint.config.js']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      },
      parserOptions: {
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-duplicate-imports': 'error'
    }
  },
  {
    files: ['scraper/**/*.ts'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['cdk/**/*.ts'],
    rules: {
      'no-new': 'off'
    }
  }
]
