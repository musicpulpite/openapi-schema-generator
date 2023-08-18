// using https://www.npmjs.com/package/@rollup/plugin-typescript
import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: {
    file: './dist/index.cjs',
    format: 'cjs',
    banner: '#!/usr/bin/env node',
  },
  plugins: [typescript()],
};