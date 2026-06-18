// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config([
  { ignores: ['dist', 'build', 'node_modules', '*.config.js', '*.config.ts'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      sonarjs,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        // Point to the app tsconfig that includes `src/**` files
        project: ['./tsconfig.app.json'],
        // Ensure project path resolves correctly for the parser in ESM/flat config
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
    rules: {
      // ✅ React + TS best practices
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',

      // ✅ Cleanup & unused code
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used' },
      ],

      // ✅ SonarJS code-quality rules
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-collapsible-if': 'warn',
      'sonarjs/no-all-duplicated-branches': 'warn',

      // ✅ React hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    // ✅ Modularity: hooks must go through services/, not call axios directly.
    files: ['**/hooks/**/*.{ts,tsx}', '**/*.hook.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                'Do not import axios directly inside hooks. Call a service in features/*/services/ which uses the central axios client.',
            },
            {
              name: '@/lib/axios',
              message:
                'Do not import the axios client directly inside hooks. Wrap the request in a service under features/*/services/ and call that from the hook.',
            },
          ],
        },
      ],
    },
  },
  {
    // ✅ Modularity: workspace module must be consumed via its public barrel.
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/components/workspace/**'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['@/components/workspace/*'],
              message:
                'Import workspace symbols from "@/components/workspace" (the public barrel). Deep imports into subpaths are legacy — see components/workspace/README.md.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used' },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
