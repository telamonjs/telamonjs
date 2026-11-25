---
'@telamonjs/ui': minor
'@telamonjs/cli': patch
---

`CrudConfig` accepts more of what apps already write, so these casts and wrappers can go:

- **`mutations.getForEdit` may resolve the entity** (`TFormData | T`), so `getForEdit: api.getById` compiles without `as any` or an `asGetForEdit` wrapper. The edit form reads the fields it declares by name, as it always did.
- **`headerConfig.iconColor` and `headerConfig.gradient` may be functions of the record** (`iconColor: r => (r.active ? 'green' : 'gray')`). Before, a function only compiled with a cast and was silently ignored at runtime; now it is resolved, falling back to `gray` and the default gradient when there is no record (the create dialog).
- **`dialogs.*.defaultValues` accepts form-only keys** (`Partial<T> & Record<string, unknown>`): a create dialog can preset `categoryId` without a cast; keys of `T` keep their type.
- **A `crud` field's `listFields` takes SubList columns** (`{ header, accessorKey | accessorFn, cell? }`, the `SubListField` type), the shape the sub-list always rendered, instead of `FormField` only. Drop the `as any` on each entry (and any `enableGlobalFilter` on it: the sub-list searches every column anyway).

These casts are not needed with the current types and can simply be deleted: `columns: columns as any` (`ColumnDef<T>[]` is accepted), `headerConfig.badge.field: '...' as any` and `badgeField()` (`field` is a `string`), `mutations: { getForView } as any` and `readOnlyMutations()` (every mutation is optional). A local `asQueryFn` copy can be replaced by the one `@telamonjs/ui` exports.
