'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Column } from '@tanstack/react-table'
import { cn } from '../../utils'
import { Button } from '../../ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { Badge } from '../../ui/badge'
import { FilterOption } from '../../types/filters'
import { useTelamonjsT } from '../../i18n/use-t'
import {
  useTableColumnFilter,
  useDataTableActions,
} from '../../stores/datatable-store'

interface DataTableColumnFilterProps<TData, TValue> {
  column: Column<TData, TValue>
  title?: string
  options?: FilterOption[] // Server-side options (optional)
  tableId: string // Required for Zustand store
}

export function DataTableColumnFilter<TData, TValue>({
  column,
  title,
  options,
  tableId,
}: DataTableColumnFilterProps<TData, TValue>) {
  const t = useTelamonjsT()
  const [open, setOpen] = React.useState(false)

  // Get filter value from Zustand store instead of column
  const filterValue = useTableColumnFilter(tableId, column.id)
  const { setColumnFilter } = useDataTableActions(tableId)

  // Determine filter options
  // If options provided (server-side), use them
  // Otherwise, use faceted values from table data (client-side)
  const filterOptions = React.useMemo(() => {
    if (options) {
      // Server-side mode: use provided options
      return options
    }

    // Client-side mode: extract unique values from table data
    // NOTE: Only compute this once at mount to avoid infinite loops
    const facetedUniqueValues = column.getFacetedUniqueValues()
    const uniqueValues = Array.from(facetedUniqueValues.keys())
      .filter(val => val !== null && val !== undefined && val !== '')
      .sort()

    return uniqueValues.map(value => ({
      value: String(value),
      label: String(value),
      count: facetedUniqueValues.get(value),
    }))
    // 'column' left out on purpose: getFacetedUniqueValues() changes identity
    // on every call and including it causes an infinite loop; facets read once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  // Limit display to reasonable number
  const displayLimit = 100
  const limitedOptions = filterOptions.slice(0, displayLimit)
  const hasMore = filterOptions.length > displayLimit

  const selectedOption = filterOptions.find(opt => opt.value === filterValue)

  return (
    <div className='flex items-center space-x-2'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            data-testid={`column-filter-trigger-${column.id}`}
            className='h-8 w-full justify-between focus-visible:ring-0'
          >
            {selectedOption ? (
              <span className='truncate'>{selectedOption.label}</span>
            ) : (
              <span className='text-muted-foreground'>{t('list.all')}</span>
            )}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[250px] p-0' align='start'>
          <Command>
            <CommandInput
              placeholder={t('data.searchField', { field: title?.toLowerCase() || t('data.value') })}
            />
            <CommandList>
              <CommandEmpty>{t('data.noMatchingResults')}</CommandEmpty>
              <CommandGroup>
                {/* "Todos" option */}
                <CommandItem
                  value='__all__'
                  onSelect={() => {
                    setColumnFilter(column.id, undefined)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !filterValue ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{t('list.all')}</span>
                  {!options && (
                    <Badge variant='secondary' className='ml-auto'>
                      {filterOptions.length}
                    </Badge>
                  )}
                </CommandItem>

                {/* Filter options */}
                {limitedOptions.map(option => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={currentValue => {
                      setColumnFilter(
                        column.id,
                        currentValue === filterValue ? undefined : currentValue
                      )
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        filterValue === option.value
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span className='flex-1 truncate'>{option.label}</span>
                    {option.count !== undefined && (
                      <Badge variant='secondary' className='ml-2'>
                        {option.count}
                      </Badge>
                    )}
                  </CommandItem>
                ))}

                {hasMore && (
                  <CommandItem disabled>
                    <span className='text-xs text-muted-foreground'>
                      {t('data.moreCount', { count: filterOptions.length - displayLimit })}
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Clear filter button */}
      {filterValue && (
        <Button
          variant='ghost'
          size='sm'
          className='h-8 w-8 p-0'
          aria-label={t('data.clearFilter')}
          onClick={() => setColumnFilter(column.id, undefined)}
        >
          <X className='h-4 w-4' />
          <span className='sr-only'>{t('data.clearFilter')}</span>
        </Button>
      )}
    </div>
  )
}
