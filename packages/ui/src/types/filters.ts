/**
 * Types for DataTable column filtering system
 */

/**
 * Option for a column filter
 */
export interface FilterOption {
  value: string
  label: string
  count?: number // Optional count of records with this value
}

/**
 * Configuration for column filters
 * Maps column accessorKey to array of filter options
 */
export type ColumnFilterConfig = Record<string, FilterOption[]>
