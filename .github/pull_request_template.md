## What and why

<!-- What changes, and the problem it solves. Link the issue if there is one. -->

## Checklist

- [ ] `pnpm build`, `pnpm lint`, `pnpm type-check` and `pnpm test` pass locally
- [ ] Public API change? The ui snapshot is updated on purpose (`pnpm test index -u`) and `pnpm docs:generate` was run
- [ ] Docs changed where the fact lives ("Changing docs" in AGENTS.md); `pnpm docs:check` passes
- [ ] A changeset (`pnpm changeset`) if the change should reach npm
