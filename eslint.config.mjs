import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.turbo/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Honor the `_`-prefix convention for intentionally-unused args/vars
    // (e.g. a param kept for an API/signature but not yet used in the body).
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Nested ternaries are hard to read; use early returns / if-else instead.
      'no-nested-ternary': 'error',
    },
  },
  {
    // Accessibility lint gate for the React surfaces.
    files: ['apps/web/src/**/*.{ts,tsx}', 'packages/ui/src/**/*.{ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: jsxA11y.flatConfigs.recommended.rules,
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // Enforce shared @beerolog/ui primitives over inline markup on the
    // feature surface (docs/contributing/frontend-conventions.md). Primitives
    // themselves live in packages/ui and are exempt.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name=/^h[1-6]$/]',
          message:
            'Use <Heading level={n}> from @beerolog/ui, not a raw <h1>–<h6>. See docs/contributing/frontend-conventions.md.',
        },
        {
          selector: "JSXOpeningElement[name.name='dialog']",
          message:
            'Use the <Dialog> primitive from @beerolog/ui, not a raw <dialog>. See docs/contributing/frontend-conventions.md.',
        },
      ],
    },
  },
)
