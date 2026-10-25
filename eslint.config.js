import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['public/firebase-messaging-sw.js'],
    languageOptions: {
      globals: {
        URL: 'readonly',
        importScripts: 'readonly',
        self: 'readonly',
      },
    },
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: {
      globals: {
        URL: 'readonly',
      },
    },
  },
  ...tseslint.configs.recommended,
);
