---
'@telamonjs/ui': minor
'@telamonjs/cli': patch
---

`CrudConfig` takes API clients and actions as they are typed, so the `asQueryFn` / `asCreateFn` wrappers can go:

- **`query.queryFn` receives `ListQueryParams`**, the params ListPage actually sends: `page`, `pageSize`, `search?`, `sortBy?`, `sortOrder?`, `filters?`, with `sortBy` always ONE column as a `string` (the list reduces its `SortField[]` sort to the first field before calling `queryFn`, as it always did). A client typed `(params?: { page?: number; sortBy?: string; status?: string; ... })` or `(params: Record<string, unknown>)` is now a `queryFn` as is: `queryFn: api.list`. `ListQueryParams` is exported. `asQueryFn` keeps working (an unchecked cast, for a client that still does not fit, such as one whose result is not typed `PaginatedResponse<T>`).
- **`ListQueryState.params`** (what `toolbarContent` and `list.onExport` get) now holds the params exactly as `queryFn` gets them, as its docs always said: `sortBy` is the first sort column's string with its `sortOrder`, not the `SortField[]`. The full sort is still in `state.sorting`. An `onExport` that passed `params` to its client sent an array as `sortBy` before; it now sends the column.
- **`CrudConfig<T, TFormData, TResult = T>`** (and `MutationsConfig`): a third type argument says what `create`/`update` resolve in `data`, the entity by default. Actions that answer `ActionResponse<{ id: string }>` or `ActionResponse<unknown>` compile with `CrudConfig<Row, RowFormData, { id: string }>` (or `unknown`) instead of a cast, and `onSuccess(result)` gets that type. Configs that return the entity change nothing and keep a typed `onSuccess`. `CrudConfigWithAnyForm<T>` (what `ListPage` takes) accepts every `TResult`.

### Upgrading

Code that calls `config.query.queryFn` itself, or a helper typed against `(params: PaginationParams) => ...`, no longer compiles (`Type 'SortField[]' is not assignable to type 'string'`, or `Argument of type 'CrudConfig<...>' is not assignable to parameter of type 'CrudConfig<...> & { query: { queryFn: (params: PaginationParams) => ... } }'`). The fix is one type name: use `ListQueryParams` where the helper types the `queryFn` parameter.

```diff
-import type { PaginationParams, PaginatedResponse } from '@telamonjs/ui'
+import type { ListQueryParams, PaginatedResponse } from '@telamonjs/ui'

 export function withExternalFilters<T>(
-  config: T & { query: { queryKey: readonly unknown[]; queryFn: (params: PaginationParams) => Promise<PaginatedResponse<any>> } },
+  config: T & { query: { queryKey: readonly unknown[]; queryFn: (params: ListQueryParams) => Promise<PaginatedResponse<any>> } },
   extraParams: Record<string, unknown>
 ): T {
   ...
-      queryFn: (params: PaginationParams) => originalQueryFn({ ...params, ...cleaned } as PaginationParams),
+      queryFn: (params: ListQueryParams) => originalQueryFn({ ...params, ...cleaned } as ListQueryParams),
```

The same goes for a scoped `queryFn: (params: PaginationParams) => base.query.queryFn({ ...params, filters })` and for a test that calls `config.query.queryFn(params)` with `params: PaginationParams`. An API client typed `(params: PaginationParams)` keeps working as a `queryFn`; only code that *calls* one needs the new name.

Then the wrappers can be deleted: `queryFn: asQueryFn(api.list)` → `queryFn: api.list`; `mutationFn: asCreateFn<Row, RowFormData>(createAction)` whose action resolves `{ success, data?: { id } }` → `mutationFn: createAction` plus `CrudConfig<Row, RowFormData, { id: string }>`. A component or helper that receives such a config types it `CrudConfigWithAnyForm<T>` rather than `CrudConfig<T, TFormData>` (which expects the entity in `data`).
