import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist', 'node_modules', 'playground/'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      sourceType: 'module',
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: (await import('eslint-plugin-import')).default,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs['strict-type-checked'].rules,
      ...tseslint.configs['stylistic-type-checked'].rules,

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/order': ['warn', { 'newlines-between': 'always' }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': ['error'],
    },
    settings: {
      'import/resolver': {
        typescript: true,
      },
    },
  },
];
