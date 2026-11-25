import type { Config } from 'jest'

// Single config (no unit/integration/e2e split — the scaffold only ships
// spec tests for the guards and the usuarios service).
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json', isolatedModules: true }],
  },
  testEnvironment: 'node',
  // @auth/core and its deps, and the @telamonjs/* packages, are ESM — they
  // need to be transformed instead of left in node_modules untouched (Node
  // loads them through require(esm) at runtime; Jest does not).
  // pnpm nests packages under node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>
  // — the lookahead needs to scan the rest of the path (.*), not just the
  // next path segment.
  transformIgnorePatterns: ['node_modules/(?!.*(@auth[+/]core|@panva[+/]hkdf|jose|oauth4webapi|@telamonjs[+/]))'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // ts-jest does not read tsconfig "paths" for module resolution — mirror
    // the {{scope}}/shared aliases from tsconfig.json here too.
    '^{{scope}}/shared/prisma$': '<rootDir>/../../packages/shared/src/lib/prisma',
    '^{{scope}}/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^{{scope}}/shared$': '<rootDir>/../../packages/shared/src',
  },
}

export default config
