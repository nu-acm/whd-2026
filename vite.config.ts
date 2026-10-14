import { defineConfig, lazyPlugins, type Plugin } from 'vite-plus';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

export default defineConfig({
  lint: {
    plugins: ['oxc', 'typescript', 'unicorn'],
    categories: {
      correctness: 'warn',
    },
    env: {
      builtin: true,
    },
    ignorePatterns: [
      'dist/**',
      'node_modules/**',
      '.wrangler/**',
      'output/**',
      'src/routeTree.gen.ts',
      '.agents/skills/**',
    ],
    settings: { shadcn: { note: 'Use WHD tokens and component variants.' } },
    rules: {
      'shadcn/no-restyle': ['error', { allow: ['layout'] }],
      'shadcn/no-raw-colors': 'error',
      'shadcn/no-arbitrary-values': 'error',
      'shadcn/no-inline-styles': 'error',
      'shadcn/no-unknown-classes': 'error',
      'shadcn/require-static-classes': 'error',
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-const-assign': 'error',
      'no-constant-binary-expression': 'error',
      'no-constant-condition': 'error',
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-delete-var': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-empty-static-block': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-import-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-nonoctal-decimal-escape': 'error',
      'no-obj-calls': 'error',
      'no-prototype-builtins': 'error',
      'no-redeclare': 'error',
      'no-regex-spaces': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-this-before-super': 'error',
      'no-unassigned-vars': 'error',
      'no-undef': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-labels': 'error',
      'no-unused-private-class-members': 'error',
      'no-unused-vars': 'error',
      'no-useless-assignment': 'error',
      'no-useless-backreference': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'no-with': 'error',
      'preserve-caught-error': 'error',
      'require-yield': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-array-constructor': 'error',
      'no-unused-expressions': 'error',
      'typescript/ban-ts-comment': 'error',
      'typescript/no-duplicate-enum-values': 'error',
      'typescript/no-empty-object-type': 'error',
      'typescript/no-explicit-any': 'error',
      'typescript/no-extra-non-null-assertion': 'error',
      'typescript/no-misused-new': 'error',
      'typescript/no-namespace': 'error',
      'typescript/no-non-null-asserted-optional-chain': 'error',
      'typescript/no-require-imports': 'error',
      'typescript/no-this-alias': 'error',
      'typescript/no-unnecessary-type-constraint': 'error',
      'typescript/no-unsafe-declaration-merging': 'error',
      'typescript/no-unsafe-function-type': 'error',
      'typescript/no-wrapper-object-types': 'error',
      'typescript/prefer-as-const': 'error',
      'typescript/prefer-namespace-keyword': 'error',
      'typescript/triple-slash-reference': 'error',
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    overrides: [
      {
        files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
        rules: {
          'constructor-super': 'off',
          'getter-return': 'off',
          'no-class-assign': 'off',
          'no-const-assign': 'off',
          'no-dupe-class-members': 'off',
          'no-dupe-keys': 'off',
          'no-func-assign': 'off',
          'no-import-assign': 'off',
          'no-new-native-nonconstructor': 'off',
          'no-obj-calls': 'off',
          'no-redeclare': 'off',
          'no-setter-return': 'off',
          'no-this-before-super': 'off',
          'no-undef': 'off',
          'no-unreachable': 'off',
          'no-unsafe-negation': 'off',
          'no-var': 'error',
          'no-with': 'off',
          'prefer-const': 'error',
          'prefer-rest-params': 'error',
          'prefer-spread': 'error',
        },
      },
      {
        files: ['**/*.{ts,tsx}'],
        rules: {
          'react/rules-of-hooks': 'error',
          'react/exhaustive-deps': 'warn',
          'react/static-components': 'error',
          'react/use-memo': 'error',
          'react/preserve-manual-memoization': 'error',
          'react/incompatible-library': 'warn',
          'react/immutability': 'error',
          'react/globals': 'error',
          'react/refs': 'error',
          'react/set-state-in-effect': 'error',
          'react/error-boundaries': 'error',
          'react/purity': 'error',
          'react/set-state-in-render': 'error',
          'react/unsupported-syntax': 'warn',
          'react/only-export-components': [
            'warn',
            {
              allowConstantExport: true,
            },
          ],
        },
        env: {
          es2022: true,
          browser: true,
        },
        plugins: ['react'],
      },
      {
        files: ['src/components/ui/button.tsx'],
        rules: {
          // The shadcn API re-exports a helper whose identity lives in a separate module.
          'react/only-export-components': [
            'warn',
            { allowConstantExport: true, allowExportNames: ['buttonVariants'] },
          ],
        },
        plugins: ['react'],
      },
      {
        files: ['src/routes/**/*.tsx'],
        rules: {
          'react/only-export-components': 'off',
        },
        plugins: ['react'],
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      '@shadcn/lint',
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
  test: {
    include: ['tests/server/**/*.test.ts'],
    setupFiles: ['./tests/server/setup.ts'],
  },
  fmt: {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 2,
    sortPackageJson: false,
    sortTailwindcss: { stylesheet: './src/styles.css' },
    ignorePatterns: [
      'dist/**',
      'node_modules/**',
      'public/**',
      '.wrangler/**',
      'output/**',
      'src/routeTree.gen.ts',
      '.agents/skills/**',
    ],
  },
  server: { port: 3000, strictPort: true },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: lazyPlugins(async () => {
    if (process.env.VITEST === 'true') {
      return [
        cloudflareTest({
          miniflare: {
            compatibilityDate: '2026-10-13',
            compatibilityFlags: ['nodejs_compat'],
            d1Databases: ['DB'],
            bindings: {
              TEST_MIGRATIONS: await readD1Migrations('./drizzle'),
              BETTER_AUTH_URL: 'http://localhost:3000',
              BETTER_AUTH_SECRET: 'test-only-auth-secret-with-at-least-32-characters',
              GAS_URL: 'https://mail.example.test/exec',
              GAS_SECRET: 'test-only-webhook-secret',
              ADMIN_EMAILS: 'admin@example.test',
              REGISTRATION_DEADLINE: '2099-01-01T00:00:00Z',
            },
          },
        }),
      ];
    }

    const [
      { devtools },
      { cloudflare },
      { default: tailwindcss },
      { tanstackStart },
      { default: react },
      { ViteImageOptimizer },
    ] = await Promise.all([
      import('@tanstack/devtools-vite'),
      import('@cloudflare/vite-plugin'),
      import('@tailwindcss/vite'),
      import('@tanstack/react-start/plugin/vite'),
      import('@vitejs/plugin-react'),
      import('vite-plugin-image-optimizer'),
    ]);

    const imageOptimizer = ViteImageOptimizer({
      includePublic: true,
      png: { quality: 80 },
      jpg: { quality: 80 },
      svg: { multipass: true },
    });
    const resolveImageConfig =
      typeof imageOptimizer.configResolved === 'function'
        ? imageOptimizer.configResolved
        : imageOptimizer.configResolved?.handler;
    const clientImageOptimizer: Plugin = {
      ...imageOptimizer,
      applyToEnvironment: (environment) => environment.name === 'client',
      configResolved(config) {
        // The optimizer reads the legacy build.outDir, so give it the client output.
        return resolveImageConfig?.call(this, {
          ...config,
          build: config.environments.client.build,
        });
      },
    };

    return [
      // Devtools are stripped from production builds.
      devtools(),
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tailwindcss(),
      tanstackStart({
        router: {
          routeTreeFileHeader: [
            '/* oxlint-disable */',
            '// @ts-nocheck',
            '// noinspection JSUnusedGlobalSymbols',
          ],
        },
      }),
      react(),
      // Recompress PNG, JPG and SVG assets, including public files.
      clientImageOptimizer,
    ];
  }),
});
