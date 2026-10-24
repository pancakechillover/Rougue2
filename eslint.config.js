import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '**/*.d.ts'] },

  // Base JS rules
  js.configs.recommended,

  // TypeScript + React hooks, first pass: deliberately lenient
  {
    files: ['src/**/*.{ts,tsx}', 'api/**/*.ts', 'server.ts'],
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // no-undef is off: the TS compiler owns this check, and eslint otherwise
      // flags legitimate TS type names (NodeJS, EventListener, ...) as undefined.
      'no-undef': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { args: 'none', varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      'no-console': 'off',

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Real issues found by the first audit; deferred to the strict pass (P1-2).
      'no-useless-assignment': 'warn',
      'preserve-caught-error': 'warn',
    },
  },

  // Server/API code has no DOM
  {
    files: ['server.ts', 'api/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
);
