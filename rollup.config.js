import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

function configurePlugins({declaration = false}) {
  return [
    // Resolve node modules in addition to local modules.
    nodeResolve({browser: true}),

    typescript({
      tsconfig: `tsconfig.json`,
      rootDir: `src`,
      noEmitOnError: false,
      ...declaration ? {
        declaration: true,
        declarationDir: 'dist',
      } : null,
    }),

    // Rollup only resolves ES2015 modules by default, so make it work with
    // CommonJS modules too.
    commonjs({
      exclude: [`src/**`],
    }),

    // Allow JSON files to be imported as modules.
    json({compact: true}),
  ];
}

function configureTarget({output, declaration = false}) {
  return {
    input: 'src/index.ts',
    output,
    plugins: configurePlugins({declaration}),
  };
}

export default [
  // CommonJS
  configureTarget({
    output: {
      format: 'cjs',
      sourcemap: true,
      dir: 'dist',
    },
    declaration: true,
  }),
  configureTarget({
    output: [
      // ESModule
      {
        format: 'es',
        sourcemap: true,
        file: 'dist/index.es.js',
      },
      // UMD
      {
        format: 'umd',
        name: 'PluralRules',
        sourcemap: true,
        file: 'dist/pluralrules.js',
      },
      // UMD minified
      {
        format: 'umd',
        name: 'PluralRules',
        sourcemap: true,
        file: 'dist/pluralrules.min.js',
        plugins: [terser()]
      },
    ],
    minify: true,
  }),
];
