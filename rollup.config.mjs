import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

function configurePlugins({ declaration = false }) {
  return [
    // Resolve node modules in addition to local modules.
    nodeResolve({ browser: true }),

    typescript({
      tsconfig: `tsconfig.json`,
      rootDir: `src`,
      noEmitOnError: false,
      ...declaration ? {
        declaration: true,
        declarationDir: 'dist',
      } : null,
    }),
  ];
}

function configureTarget({ output, declaration = false }) {
  return {
    input: 'src/index.ts',
    output,
    plugins: configurePlugins({ declaration }),
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
  // ESModule
  configureTarget({
    output: {
      format: 'es',
      sourcemap: true,
      file: 'dist/index.es.js',
    },
  }),
];
