import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: './src/index.ts',
  output: {
    file: './dist/index.cjs',
    format: 'cjs',
    banner: '#!/usr/bin/env node',
  },
  plugins: [typescript(), nodeResolve(), commonjs()],
};