import path from 'path'
import { fileURLToPath } from 'url'
import { includeIgnoreFile } from '@eslint/compat'
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin'
import typescriptEslintParser from '@typescript-eslint/parser'
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort'
import prettierPlugin from 'eslint-plugin-prettier'
// skipcq: JS-W1028
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import n8nNodesBasePlugin from 'eslint-plugin-n8n-nodes-base'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const gitignorePath = path.resolve(__dirname, '.gitignore')

export default [
  includeIgnoreFile(gitignorePath),
  {
    ignores: [
      'eslint.config.mjs',
      'gulpfile.mjs',
      '**/node_modules/**',
      '**/dist/**',
      '**/*.js',
      '**/*.mjs',
      '**/.gitignore',
      '**/.DS_Store',
      '**/dist-ssr',
      '**/*.local',
      '**/lib',
      '**/package.json',
      '**/tsconfig.json',
      '**/tests/**',
    ],
  },
  {
    files: ['**/*.ts'], // Specify the files to lint
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'module',
      globals: {
        browser: 'readonly',
        es6: 'readonly',
        node: 'readonly',
        amd: 'readonly',
      },
      parser: typescriptEslintParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        extraFileExtensions: ['.json'],
      },
    },
    settings: {
      'import/resolver': {
        node: {
          paths: ['./src'],
          extensions: ['.js', '.ts'],
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
      'simple-import-sort': simpleImportSortPlugin,
      prettier: prettierPlugin,
      'n8n-nodes-base': n8nNodesBasePlugin,
    },
    rules: {
      'prettier/prettier': [
        'error',
        {
          trailingComma: 'all',
          tabWidth: 2,
          semi: false,
          singleQuote: true,
          printWidth: 120,
          endOfLine: 'auto',
        },
      ],
      '@typescript-eslint/no-unused-vars': 'warn', // Certain methods need to match but cannot
      '@typescript-eslint/explicit-function-return-type': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      semi: ['error', 'never'], // Enforce no semicolons
      '@typescript-eslint/no-explicit-any': 'error', // Enforce no any types
    },
  },
  {
    files: ['**/*.md'],
    // Use the markdown processor so code fences are extracted and linted
    processor: 'markdown/markdown',
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2019,
        sourceType: 'module',
      },
    },
    plugins: {
      prettier: prettierPlugin,
      '@typescript-eslint': typescriptEslintPlugin,
    },
    rules: {
      // Let Prettier validate markdown formatting; developers can run pnpm lint:format to auto-fix
      'prettier/prettier': [
        'error',
        {
          trailingComma: 'all',
          tabWidth: 2,
          semi: false,
          singleQuote: true,
          printWidth: 120,
          endOfLine: 'auto',
        },
      ],
    },
  },
  {
    files: ['package.json'],
    plugins: {
      'n8n-nodes-base': n8nNodesBasePlugin,
    },
    rules: {
      ...n8nNodesBasePlugin.configs.community.rules,
      'n8n-nodes-base/community-package-json-name-still-default': 'off',
    },
  },
  {
    files: ['./credentials/**/*.ts'],
    plugins: {
      'n8n-nodes-base': n8nNodesBasePlugin,
    },
    rules: {
      ...n8nNodesBasePlugin.configs.credentials.rules,
      'n8n-nodes-base/cred-class-field-documentation-url-missing': 'off',
      'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
    },
  },
  {
    files: ['./nodes/**/*.ts'],
    plugins: {
      'n8n-nodes-base': n8nNodesBasePlugin,
    },
    rules: {
      ...n8nNodesBasePlugin.configs.nodes.rules,
      'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
      'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
      'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
    },
  },
  // Lint JavaScript code fences inside Markdown files
  {
    files: ['**/*.md/*.js'],
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'module',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'no-console': 'warn',
    },
  },
  // Lint TypeScript code fences inside Markdown files
  {
    files: ['**/*.md/*.ts'],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  eslintConfigPrettier,
]
