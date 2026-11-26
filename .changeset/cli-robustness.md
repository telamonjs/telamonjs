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

The schema parser no longer truncates a model at a `}` inside a string (`@default("{}")`)
or a comment, ignores commented-out models, reads `@default(cuid())` whole, and matches
`--model` literally instead of as a regular expression.

Formatting the generated files works for paths with spaces (Prettier gets an argument
list instead of a shell string), never downloads Prettier when the app doesn't have it,
and a failure now prints Prettier's reason instead of a generic "not found".
