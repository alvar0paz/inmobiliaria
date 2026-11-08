// Lints the hand-written code: browser scripts, the page generator, server code and tests.
import js from '@eslint/js';
import globals from 'globals';

export default [
  {ignores: ['dist/**', '.next/**', '.vinext/**', '.wrangler/**', 'node_modules/**', 'public/vendor/**', 'scripts/**', '**/*.ts', '**/*.tsx']},
  js.configs.recommended,
  {files: ['public/**/*.js'], languageOptions: {sourceType: 'script', globals: {...globals.browser, THREE: 'readonly', Architecture: 'writable', ViewerControls: 'writable', AlphaAssets: 'writable', module: 'readonly'}}},
  {files: ['site/**/*.mjs', 'lib/**/*.mjs', 'tests/**/*.mjs'], languageOptions: {sourceType: 'module', globals: {...globals.node}}},
  {files: ['tests/**/*.cjs'], languageOptions: {sourceType: 'commonjs', globals: {...globals.node}}},
  {rules: {'no-unused-vars': ['error', {argsIgnorePattern: '^_', caughtErrors: 'none'}]}},
];
