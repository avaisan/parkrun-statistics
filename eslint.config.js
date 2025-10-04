import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/cdk.out/**']
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended
    ],
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-duplicate-imports': 'error'
    }
  },
  {
    // Scraper specific config
    files: ['scraper/**/*.ts'],
    rules: {
      'no-console': 'off' // Allow console logs in API and scraper
    }
  },
  {
    // CDK specific config
    files: ['cdk/**/*.ts'],
    rules: {
      'no-new': 'off' // Allow new without assignment in CDK constructs
    }
  }
)