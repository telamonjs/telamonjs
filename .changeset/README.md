# Changesets

Every change that should reach npm ships with a changeset:

```bash
pnpm changeset            # pick the packages, the bump and write the summary
```

Releasing (maintainers):

```bash
pnpm version-packages     # applies the changesets: versions, CHANGELOGs, lockfile
pnpm release              # build + publish to npm + git tags
```
