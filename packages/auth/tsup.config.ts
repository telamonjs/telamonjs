import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'nest/index': 'src/nest/index.ts',
    'next/index': 'src/next/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['@auth/core', '@nestjs/common', '@nestjs/core']
})
