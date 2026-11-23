import { SortField } from '../types/pagination'

/**
 * Converts a sortBy string in accessorKey format (e.g. "campo.subcampo")
 * to Prisma orderBy format { campo: { subcampo: sortOrder } }
 *
 * Only dots split the path: underscores belong to the column name
 * (`created_at` stays a scalar field). `ListPage`/`InfiniteList` send the
 * column's dotted `accessorKey`, not TanStack's underscored column id.
 *
 * @example
 * buildPrismaOrderBy("categoria.nome", "asc")
 * // Returns: { categoria: { nome: "asc" } }
 *
 * buildPrismaOrderBy("created_at", "asc")
 * // Returns: { created_at: "asc" }
 *
 * buildPrismaOrderBy("createdAt", "desc")
 * // Returns: { createdAt: "desc" }
 */
export function buildPrismaOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  if (!sortBy.includes('.')) {
    return { [sortBy]: sortOrder }
  }

  // Convert "campo.subcampo" to { campo: { subcampo: sortOrder } }
  // `any` kept intentionally: recursive accumulator builds an arbitrarily
  // nested object; callers (buildOrderByClause) declare the real return type
  // (PrismaWhereClause), `unknown` here breaks that inferred assignability.
  return sortBy.split('.').reduceRight(
    (acc, key) => ({ [key]: acc }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sortOrder as any
  )
}

/**
 * Converts an array of SortField to Prisma orderBy array format for multi-column sorting
 *
 * @example
 * buildPrismaOrderByMulti([
 *   { field: "categoria.nome", order: "asc" },
 *   { field: "vigenciaInicio", order: "desc" }
 * ])
 * // Returns: [
 * //   { categoria: { nome: "asc" } },
 * //   { vigenciaInicio: "desc" }
 * // ]
 */
export function buildPrismaOrderByMulti(sorting: SortField[]) {
  return sorting.map(sort => {
    if (!sort.field.includes('.')) {
      return { [sort.field]: sort.order }
    }

    // Convert "campo.subcampo" to { campo: { subcampo: order } }
    // `any` kept intentionally: see buildPrismaOrderBy above
    return sort.field.split('.').reduceRight(
      (acc, key) => ({ [key]: acc }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sort.order as any
    )
  })
}
