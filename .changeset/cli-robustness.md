---
'@telamonjs/cli': patch
---

`generate crud` finds the Prisma schema in more places: `package.json#prisma.schema`
(file or folder), a multi-file `prisma/schema/` folder (`prismaSchemaFolder`, nested
folders included) and the monorepo's `packages/shared/prisma`, also when run from
`apps/web` inside a pnpm workspace. When schema detection is on and the schema or the
model is missing, it now stops with an error that lists where it looked (or which
models the schema has) instead of quietly generating placeholder fields;
`--no-prisma-schema` still generates generic fields on purpose.
