import { SortField } from '../types/pagination'

/**
 * Converts a sortBy string from accessorKey format (e.g. "campo.subcampo" or "campo_subcampo")
 * to Prisma orderBy format { campo: { subcampo: sortOrder } }
 *
 * TanStack Table converts dots to underscores in column IDs, so we handle both formats.
 *
 * @example
 * buildPrismaOrderBy("categoria.nome", "asc")
 * // Returns: { categoria: { nome: "asc" } }
 *
 * buildPrismaOrderBy("categoria_nome", "asc")  // TanStack Table format
 * // Returns: { categoria: { nome: "asc" } }
 *
 * buildPrismaOrderBy("createdAt", "desc")
 * // Returns: { createdAt: "desc" }
 */
export function buildPrismaOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  // TanStack Table converts dots to underscores, so we normalize back to dots
  const normalizedSortBy = sortBy.replace(/_/g, '.')

  if (!normalizedSortBy.includes('.')) {
    return { [normalizedSortBy]: sortOrder }
  }

  // Convert "campo.subcampo" to { campo: { subcampo: sortOrder } }
  // `any` kept intentionally: recursive accumulator builds an arbitrarily
  // nested object; callers (buildOrderByClause) declare the real return type
  // (PrismaWhereClause), `unknown` here breaks that inferred assignability.
  return normalizedSortBy
    .split('.')
    .reduceRight(
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
    // Normalize underscores to dots (TanStack Table format)
    const normalizedField = sort.field.replace(/_/g, '.')

    if (!normalizedField.includes('.')) {
      return { [normalizedField]: sort.order }
    }

    // Convert "campo.subcampo" to { campo: { subcampo: order } }
    // `any` kept intentionally: see buildPrismaOrderBy above
    return normalizedField
      .split('.')
      .reduceRight(
        (acc, key) => ({ [key]: acc }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sort.order as any
      )
  })
}
