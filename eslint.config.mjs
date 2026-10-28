import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

/**
 * Flat config covering the three languages in this repo: plain TypeScript,
 * Vue SFCs, and the ESM config files at the root.
 */
export default ts.config(
  {
    ignores: [
      'dist/**',
      'storybook-static/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
    ],
  },

  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    files: ['**/*.{ts,mts,vue}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        parser: ts.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      /**
       * A binding can be there to say what is *not* wanted, and that is a use.
       *
       * Dropping one key of an object is written by naming it beside a rest —
       * `const { maximized: _was, ...restored } = held` — where the name is
       * the only way to say which key goes, and reading it back would defeat
       * the point. The `_` prefix is how the code says so everywhere else, so
       * the linter is told to read it the same way rather than having to be
       * silenced line by line.
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  {
    /**
     * Props are typed through `defineProps<{ … }>()`, where an optional prop is
     * deliberately `undefined` until the component resolves its own fallback —
     * a default would be a second, conflicting answer. The rule predates
     * type-only prop declarations and cannot see that.
     */
    files: ['**/*.vue'],
    rules: {
      'vue/require-default-prop': 'off',
    },
  },
)
