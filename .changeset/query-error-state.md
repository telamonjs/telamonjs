---
'@telamonjs/ui': minor
---

New public `QueryErrorState`: the error state for screens that run their own `useQuery`, so apps stop keeping a local `QueryErrorAlert`.

- `error` (an `Error`, a string or any object with a string `message`) becomes the description; `title` and `description` take `I18nText`, with a localized "Failed to load data" default.
- `onRetry` shows a "Try again" button, called with no arguments (`onRetry={refetch}` is safe), pending (disabled, spinner, `aria-busy`) while the promise it returns runs; `retrying` drives the same state from the caller. The button is `type="button"`.
- It is now the single implementation behind the CRUD view/edit dialogs' load error, which gain a working "Try again" (they had none). The internal `DialogErrorState` is gone, and so is the never-set error branch of `CreateDialog`.

Migrating a local `QueryErrorAlert({ message, onRetry })`: `message` → `title` (or `description`), `onRetry={() => refetch()}` → `onRetry={refetch}`, and add `className='mb-4'` where the layout relied on the local copy's margin.
