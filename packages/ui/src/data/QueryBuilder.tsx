'use client'

/**
 * QueryBuilder Component
 * Visual query builder for advanced filtering
 */

import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { X, Plus } from 'lucide-react'
import { cn } from '../utils'
import { useTelamonjsT } from '../i18n/use-t'
import {
  QueryCondition,
  QueryGroup,
  FieldType,
  Operator,
  getOperatorsForFieldType,
  validateCondition,
  generateConditionId,
} from './queryBuilderUtils'

export interface QueryBuilderField {
  name: string
  label: string
  type: FieldType
  options?: Array<{ value: string; label: string }> // For enum type
}

interface QueryBuilderProps {
  fields: QueryBuilderField[]
  value?: QueryGroup
  onChange: (group: QueryGroup) => void
  className?: string
}

export function QueryBuilder({
  fields,
  value,
  onChange,
  className,
}: QueryBuilderProps) {
  const t = useTelamonjsT()
  const [group, setGroup] = useState<QueryGroup>(
    value || { logic: 'AND', conditions: [] }
  )

  const handleAddCondition = () => {
    const newCondition: QueryCondition = {
      id: generateConditionId(),
      field: fields[0]?.name || '',
      operator: 'equals',
      value: '',
      fieldType: fields[0]?.type || 'string',
    }

    const updatedGroup = {
      ...group,
      conditions: [...group.conditions, newCondition],
    }
    setGroup(updatedGroup)
    onChange(updatedGroup)
  }

  const handleRemoveCondition = (id: string) => {
    const updatedGroup = {
      ...group,
      conditions: group.conditions.filter(c => c.id !== id),
    }
    setGroup(updatedGroup)
    onChange(updatedGroup)
  }

  const handleUpdateCondition = (
    id: string,
    updates: Partial<QueryCondition>
  ) => {
    const updatedGroup = {
      ...group,
      conditions: group.conditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }
    setGroup(updatedGroup)
    onChange(updatedGroup)
  }

  const handleLogicChange = (logic: 'AND' | 'OR') => {
    const updatedGroup = { ...group, logic }
    setGroup(updatedGroup)
    onChange(updatedGroup)
  }

  const handleFieldChange = (id: string, fieldName: string) => {
    const field = fields.find(f => f.name === fieldName)
    if (!field) return

    // Reset operator and value when field changes
    const operators = getOperatorsForFieldType(field.type, t)
    handleUpdateCondition(id, {
      field: fieldName,
      fieldType: field.type,
      operator: operators[0]?.value || 'equals',
      value: '',
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Logic selector (AND/OR) */}
      {group.conditions.length > 1 && (
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>
            {t('data.combineConditionsWith')}
          </span>
          <Select
            value={group.logic}
            onValueChange={(value: string) =>
              handleLogicChange(value as 'AND' | 'OR')
            }
          >
            <SelectTrigger className='w-[100px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='AND'>{t('data.andOption')}</SelectItem>
              <SelectItem value='OR'>{t('data.orOption')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Conditions list */}
      <div className='space-y-3'>
        {group.conditions.map((condition, index) => {
          const field = fields.find(f => f.name === condition.field)
          const operators = getOperatorsForFieldType(
            condition.fieldType || 'string',
            t
          )
          const needsValue =
            condition.operator !== 'isNull' &&
            condition.operator !== 'isNotNull'

          return (
            <div key={condition.id} className='space-y-2'>
              {/* AND/OR label between conditions */}
              {index > 0 && (
                <div className='text-xs font-medium text-muted-foreground pl-2'>
                  {group.logic === 'AND' ? t('data.logicAnd') : t('data.logicOr')}
                </div>
              )}

              <div className='flex items-start gap-2'>
                {/* Field selector */}
                <Select
                  value={condition.field}
                  onValueChange={value =>
                    handleFieldChange(condition.id, value)
                  }
                >
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder={t('data.selectField')} />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map(f => (
                      <SelectItem key={f.name} value={f.name}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator selector */}
                <Select
                  value={condition.operator}
                  onValueChange={value =>
                    handleUpdateCondition(condition.id, {
                      operator: value as Operator,
                    })
                  }
                >
                  <SelectTrigger className='w-[160px]'>
                    <SelectValue placeholder={t('data.selectOperatorPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value input */}
                {needsValue && (
                  <div className='flex-1'>
                    {field?.type === 'boolean' ? (
                      <Select
                        value={String(condition.value)}
                        onValueChange={value =>
                          handleUpdateCondition(condition.id, {
                            value: value === 'true',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('data.selectValue')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='true'>{t('common.yes')}</SelectItem>
                          <SelectItem value='false'>{t('common.no')}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : field?.type === 'enum' && field.options ? (
                      <Select
                        value={String(condition.value)}
                        onValueChange={value =>
                          handleUpdateCondition(condition.id, { value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('data.selectValue')} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field?.type === 'date' ? (
                      <Input
                        type='date'
                        value={
                          condition.value instanceof Date
                            ? condition.value.toISOString().split('T')[0]
                            : String(condition.value ?? '')
                        }
                        onChange={e =>
                          handleUpdateCondition(condition.id, {
                            value: e.target.value
                              ? new Date(e.target.value)
                              : '',
                          })
                        }
                        placeholder={t('data.valuePlaceholder')}
                      />
                    ) : field?.type === 'number' ? (
                      <Input
                        type='number'
                        value={String(condition.value ?? '')}
                        onChange={e =>
                          handleUpdateCondition(condition.id, {
                            value: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                        placeholder={t('data.valuePlaceholder')}
                      />
                    ) : (
                      <Input
                        type='text'
                        value={String(condition.value ?? '')}
                        onChange={e =>
                          handleUpdateCondition(condition.id, {
                            value: e.target.value,
                          })
                        }
                        placeholder={t('data.valuePlaceholder')}
                      />
                    )}
                  </div>
                )}

                {/* Remove button */}
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => handleRemoveCondition(condition.id)}
                  className='flex-shrink-0'
                  title={t('data.removeCondition')}
                  aria-label={t('data.removeCondition')}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>

              {/* Validation error */}
              {(() => {
                const error = validateCondition(condition, t)
                return error ? (
                  <p className='text-xs text-destructive pl-2'>{error}</p>
                ) : null
              })()}
            </div>
          )
        })}
      </div>

      {/* Add condition button */}
      <Button
        variant='outline'
        size='sm'
        onClick={handleAddCondition}
        className='w-full'
        data-testid='query-builder-add-condition'
      >
        <Plus className='h-4 w-4 mr-2' />
        {t('data.addCondition')}
      </Button>

      {/* Summary */}
      {group.conditions.length > 0 && (
        <div className='text-xs text-muted-foreground border-t pt-3'>
          {t('data.conditionsActive', { count: group.conditions.length })}
        </div>
      )}
    </div>
  )
}
