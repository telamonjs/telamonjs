/**
 * Query Builder Utilities
 * Converts visual query builder conditions to Prisma where clauses
 */

import type { useTelamonjsT } from '../i18n/use-t'

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'enum'

export type Operator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull'

export interface QueryCondition {
  id: string
  field: string
  operator: Operator
  value: string | number | boolean | Date | string[] | null
  fieldType?: FieldType
}

export interface QueryGroup {
  logic: 'AND' | 'OR'
  conditions: QueryCondition[]
}

/**
 * Get available operators for a field type
 */
/** Translator signature (telamonjs.*) — required, no pt-BR literal fallback. */
type Translator = ReturnType<typeof useTelamonjsT>

// Literal `t('data.operator...')` calls per case (not a Record lookup) so next-intl's
// typed translator can verify each key against the message schema at compile time.
function operatorLabel(op: Operator, t: Translator): string {
  switch (op) {
    case 'equals':
      return t('data.operatorEquals')
    case 'notEquals':
      return t('data.operatorNotEquals')
    case 'isNull':
      return t('data.operatorIsNull')
    case 'isNotNull':
      return t('data.operatorIsNotNull')
    case 'contains':
      return t('data.operatorContains')
    case 'notContains':
      return t('data.operatorNotContains')
    case 'startsWith':
      return t('data.operatorStartsWith')
    case 'endsWith':
      return t('data.operatorEndsWith')
    case 'gt':
      return t('data.operatorGt')
    case 'gte':
      return t('data.operatorGte')
    case 'lt':
      return t('data.operatorLt')
    case 'lte':
      return t('data.operatorLte')
    case 'in':
      return t('data.operatorIn')
    case 'notIn':
      return t('data.operatorNotIn')
  }
}

export function getOperatorsForFieldType(
  fieldType: FieldType,
  t: Translator
): Array<{
  value: Operator
  label: string
}> {
  const label = (op: Operator) => operatorLabel(op, t)

  const baseOperators = [
    { value: 'equals' as Operator, label: label('equals') },
    { value: 'notEquals' as Operator, label: label('notEquals') },
  ]

  const nullOperators = [
    { value: 'isNull' as Operator, label: label('isNull') },
    { value: 'isNotNull' as Operator, label: label('isNotNull') },
  ]

  switch (fieldType) {
    case 'string':
      return [
        ...baseOperators,
        { value: 'contains' as Operator, label: label('contains') },
        { value: 'notContains' as Operator, label: label('notContains') },
        { value: 'startsWith' as Operator, label: label('startsWith') },
        { value: 'endsWith' as Operator, label: label('endsWith') },
        ...nullOperators,
      ]
    case 'number':
    case 'date':
      return [
        ...baseOperators,
        { value: 'gt' as Operator, label: label('gt') },
        { value: 'gte' as Operator, label: label('gte') },
        { value: 'lt' as Operator, label: label('lt') },
        { value: 'lte' as Operator, label: label('lte') },
        ...nullOperators,
      ]
    case 'boolean':
      return baseOperators
    case 'enum':
      return [
        ...baseOperators,
        { value: 'in' as Operator, label: label('in') },
        { value: 'notIn' as Operator, label: label('notIn') },
        ...nullOperators,
      ]
    default:
      return baseOperators
  }
}

/**
 * Build Prisma where clause from query conditions
 */
export function buildPrismaWhere(
  group: QueryGroup
): Record<string, unknown> | undefined {
  if (!group.conditions || group.conditions.length === 0) {
    return undefined
  }

  const conditions = group.conditions
    .map(condition => buildConditionClause(condition))
    .filter(Boolean) as Record<string, unknown>[]

  if (conditions.length === 0) {
    return undefined
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  return {
    [group.logic]: conditions,
  }
}

/**
 * Build individual condition clause
 */
function buildConditionClause(
  condition: QueryCondition
): Record<string, unknown> | null {
  const { field, operator, value } = condition

  // Handle null/not null operators
  if (operator === 'isNull') {
    return { [field]: null }
  }

  if (operator === 'isNotNull') {
    return { [field]: { not: null } }
  }

  // Validate value exists for other operators
  if (value === null || value === undefined || value === '') {
    return null
  }

  // Build condition based on operator
  switch (operator) {
    case 'equals':
      return { [field]: value }

    case 'notEquals':
      return { [field]: { not: value } }

    case 'contains':
      return { [field]: { contains: value, mode: 'insensitive' } }

    case 'notContains':
      return { [field]: { not: { contains: value, mode: 'insensitive' } } }

    case 'startsWith':
      return { [field]: { startsWith: value, mode: 'insensitive' } }

    case 'endsWith':
      return { [field]: { endsWith: value, mode: 'insensitive' } }

    case 'gt':
      return { [field]: { gt: value } }

    case 'gte':
      return { [field]: { gte: value } }

    case 'lt':
      return { [field]: { lt: value } }

    case 'lte':
      return { [field]: { lte: value } }

    case 'in':
      return { [field]: { in: Array.isArray(value) ? value : [value] } }

    case 'notIn':
      return { [field]: { notIn: Array.isArray(value) ? value : [value] } }

    default:
      return null
  }
}

/**
 * Validate query condition
 */
export function validateCondition(condition: QueryCondition, t: Translator): string | null {
  if (!condition.field) {
    return t('data.fieldRequired')
  }

  if (!condition.operator) {
    return t('data.operatorRequired')
  }

  // Null operators don't need value
  if (condition.operator === 'isNull' || condition.operator === 'isNotNull') {
    return null
  }

  if (
    condition.value === null ||
    condition.value === undefined ||
    condition.value === ''
  ) {
    return t('data.valueRequired')
  }

  return null
}

/**
 * Generate unique condition ID
 */
export function generateConditionId(): string {
  return `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
