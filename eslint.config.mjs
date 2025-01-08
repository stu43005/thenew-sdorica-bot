import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import _import from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        '**/cache/',
        '**/misc/',
        '**/node_modules/',
        '**/dist/',
        '**/build/',
        '**/coverage/',
        '**/.eslintrc.js',
        '**/jest.config.js',
        '**/webpack.config.js',
    ],
}, ...fixupConfigRules(compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
)), {
    plugins: {
        '@typescript-eslint': fixupPluginRules(typescriptEslint),
        import: fixupPluginRules(_import),
        unicorn,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 5,
        sourceType: 'script',

        parserOptions: {
            project: './tsconfig.json',
        },
    },

    rules: {
        '@typescript-eslint/explicit-function-return-type': ['error', {
            allowExpressions: true,
        }],

        '@typescript-eslint/no-base-to-string': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'off',

        '@typescript-eslint/no-inferrable-types': ['error', {
            ignoreParameters: true,
        }],

        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',

        '@typescript-eslint/no-unused-vars': ['error', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrors: 'none',
        }],

        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/return-await': ['error', 'always'],
        '@typescript-eslint/only-throw-error': 'off',

        '@typescript-eslint/typedef': ['error', {
            parameter: true,
            propertyDeclaration: true,
        }],

        'import/extensions': ['error', 'ignorePackages'],
        'import/no-extraneous-dependencies': 'error',
        'import/no-unresolved': 'off',
        'import/no-useless-path-segments': 'error',
        'import/order': 'off',

        'no-empty': ['error', {
            allowEmptyCatch: true,
        }],

        'no-return-await': 'off',
        'no-unused-vars': 'off',
        'prefer-const': 'error',

        quotes: ['error', 'single', {
            allowTemplateLiterals: true,
        }],

        'sort-imports': ['error', {
            allowSeparatedGroups: true,
            ignoreCase: true,
            ignoreDeclarationSort: true,
            ignoreMemberSort: true,
            memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        }],

        'unicorn/prefer-node-protocol': 'error',
    },
}];