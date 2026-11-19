'use client'

import { CheckIcon, LoaderIcon, PlusCircleIcon } from 'lucide-react'
import { Control, ControllerRenderProps, useController } from 'react-hook-form'
import { forwardRef, useEffect, useRef, useState, useId } from 'react'
import { cn } from '../../utils'
import { Badge } from '../../ui/badge'
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
import { Separator } from '../../ui/separator'
import { ScrollArea } from '../../ui/scroll-area'
import { resolveLabel, useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import { useDependentValue } from '../../hooks/use-dependent-value'

interface IOption {
  value: string
  /** Literal or `msg()` (I18nText) — resolved once when the options load. */
  label: I18nText
}

type ResolvedOption = Omit<IOption, 'label'> & { label: string }

interface MultiSelectProps {
  control?: Control
  name: string
  dependsOn?: string
  label?: string
  loadOptions: (
    search?: string,
    id?: string,
    dependsOn?: string
  ) => Promise<IOption[]>
  autoFocus?: boolean
  colStyle?: boolean
  className?: string
  disabled?: boolean
  placeholder?: string
  /** Allow creating new options inline */
  allowCreate?: boolean
  /** Callback when creating new option */
  onCreateOption?: (value: string) => Promise<IOption> | IOption
  /** Maximum number of selections */
  maxSelections?: number
  /** Loading state for async operations */
  loading?: boolean
}

interface LiveRegionProps {
  message: string
  level?: 'polite' | 'assertive'
}

/** How many labels fit in the trigger before collapsing into "+N" */
const MAX_VISIBLE_BADGES = 3

const LiveRegion = ({ message, level = 'polite' }: LiveRegionProps) => (
  <div aria-live={level} aria-atomic='true' className='sr-only'>
    {message}
  </div>
)

export const MultiSelect = forwardRef<ControllerRenderProps, MultiSelectProps>(
  (
    {
      control,
      name,
      label,
      loadOptions,
      colStyle,
      dependsOn,
      className,
      disabled: disabledProp = false,
      placeholder,
      allowCreate = false,
      onCreateOption,
      maxSelections,
    },
    _ref
  ) => {
    const t = useTelamonjsT()
    const text = useText()
    const resolvedPlaceholder =
      placeholder ?? t('business.selector.choosePlaceholder')
    const { field, fieldState } = useController({ control, name })
    const [selectedValues, setSelectedValues] = useState<string[]>(
      () => field.value || []
    )
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [data, setData] = useState<ResolvedOption[]>([])
    const [error, setError] = useState<string | null>(null)
    const [announceMessage, setAnnounceMessage] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    // `data` is the result of loadOptions(search) — it goes away when the user
    // types in the search box. The trigger needs the labels of what is selected,
    // not what the current search returned, so we keep everything already seen.
    // State (not a ref): its contents are read during render to build the
    // selected-badges list below.
    const [knownLabels, setKnownLabels] = useState<Map<string, string>>(
      () => new Map()
    )

    // Same contract as combobox.tsx: the 3rd arg of loadOptions is the VALUE
    // of the field named by `dependsOn` (null outside a FormProvider).
    const dependentValue = useDependentValue(dependsOn) as string | undefined
    const hasDependentValue =
      dependentValue !== undefined &&
      dependentValue !== null &&
      dependentValue !== ''
    // disabled until the field it depends on has a value
    const disabled = disabledProp || (!!dependsOn && !hasDependentValue)

    // Accessibility setup
    const multiselectId = useId()

    const announce = (message: string) => {
      setAnnounceMessage('')
      setTimeout(() => setAnnounceMessage(message), 100)
    }

    // O(1) per option instead of scanning the selection for each one.
    const selectedSet = new Set(selectedValues)

    const ariaAttributes = {
      id: multiselectId,
      'aria-label': label || t('business.selector.multiselectLabel', { name }),
      'aria-expanded': open,
      'aria-haspopup': 'listbox' as const,
      'aria-controls': `${multiselectId}-listbox`,
      'aria-invalid': fieldState.invalid,
      role: 'combobox' as const,
    }

    // Reset selectedValues when field.value/dependsOn change (React
    // "adjusting state when a prop changes" pattern — avoids an effect).
    const [prevFieldValue, setPrevFieldValue] = useState(field.value)
    const [prevDependsOn, setPrevDependsOn] = useState(dependsOn)
    if (field.value !== prevFieldValue || dependsOn !== prevDependsOn) {
      setPrevFieldValue(field.value)
      setPrevDependsOn(dependsOn)
      setSelectedValues(field.value || [])
    }

    // The selection belongs to the previous dependent value: clear it when the
    // user switches. Only after a real (non-empty) value changes — a form reset
    // that fills both fields at once (edit mode) must keep the selection.
    const prevDependentValue = useRef(dependentValue)
    useEffect(() => {
      const prev = prevDependentValue.current
      prevDependentValue.current = dependentValue
      const prevHadValue = prev !== undefined && prev !== null && prev !== ''
      if (prevHadValue && prev !== dependentValue && field.value?.length) {
        setSelectedValues([])
        field.onChange([])
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- runs only when the dependent value changes
    }, [dependentValue])

    // Selecting an option must not refetch the list: the current value is read
    // from a ref, and only a value whose label is still unknown (edit-mode reset)
    // triggers a new load.
    const valueRef = useRef(field.value)
    useEffect(() => {
      valueRef.current = field.value
    })
    const hasUnknownSelected = (
      (field.value as string[] | undefined) ?? []
    ).some(v => !knownLabels.has(v))

    // Load options effect
    useEffect(() => {
      let ignore = false
      const loadData = async () => {
        try {
          setIsLoading(true)
          setError(null)
          const result = (
            await loadOptions(search, valueRef.current, dependentValue)
          )?.map(o => resolveLabel(text, o))
          // A newer search started while this one was in flight.
          if (ignore) return
          if (result?.length) {
            setKnownLabels(prev => {
              const next = new Map(prev)
              result.forEach(o => next.set(o.value, o.label))
              return next
            })
          }
          setData(result || [])
        } catch (err) {
          if (ignore) return
          setError(
            err instanceof Error
              ? err.message
              : t('business.selector.loadError')
          )
        } finally {
          if (!ignore) setIsLoading(false)
        }
      }

      const timeoutId = setTimeout(loadData, 300) // Debounce
      return () => {
        ignore = true
        clearTimeout(timeoutId)
      }
    }, [search, hasUnknownSelected, dependentValue, loadOptions, t, text])

    // Handle create new option
    const handleCreateOption = async () => {
      if (!allowCreate || !onCreateOption || !search.trim()) return

      try {
        setIsCreating(true)
        const newOption = resolveLabel(
          text,
          await Promise.resolve(onCreateOption(search.trim()))
        )

        // Add to data
        setKnownLabels(prev =>
          new Map(prev).set(newOption.value, newOption.label)
        )
        setData(prev => [...prev, newOption])

        // Add to selected values
        const updatedValues = [...selectedValues, newOption.value]
        setSelectedValues(updatedValues)
        field.onChange(updatedValues)

        // Clear search
        setSearch('')
        announce(
          t('business.selector.createdAndAdded', { label: newOption.label })
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('business.selector.createError')
        )
      } finally {
        setIsCreating(false)
      }
    }

    // Check if max selections reached
    const isMaxSelectionsReached =
      maxSelections !== undefined && selectedValues.length >= maxSelections

    // Check if search matches existing option
    const exactMatch = data.find(
      opt => opt.label.toLowerCase() === search.trim().toLowerCase()
    )
    const showCreateOption =
      allowCreate && search.trim() && !exactMatch && !isMaxSelectionsReached

    if (error) {
      return (
        <span className='text-red-500'>
          {t('business.selector.errorPrefix', { message: error })}
        </span>
      )
    }

    return (
      <div
        className={cn(
          'flex flex-1 gap-2',
          colStyle ? 'flex-row items-center' : 'flex-col',
          className
        )}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              {...ariaAttributes}
              disabled={disabled}
              className={cn(
                'flex-1 justify-start bg-card shadow-md',
                fieldState.invalid ? 'border-red-500' : '',
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              )}
              onKeyDown={e => {
                if (disabled) return

                if (e.key === 'Enter' && !open) {
                  e.preventDefault()
                  setOpen(true)
                  announce(t('business.selector.opened'))
                }
                if (e.key === 'Escape' && open) {
                  setOpen(false)
                  announce(t('business.selector.closed'))
                }
                if (e.key === 'ArrowDown' && !open) {
                  e.preventDefault()
                  setOpen(true)
                  announce(t('business.selector.opened'))
                }
              }}
            >
              {isLoading ? (
                <LoaderIcon className='animate-spin' />
              ) : (
                <>
                  <PlusCircleIcon className='mr-2 h-4 w-4' />
                  {selectedValues?.length > 0 ? (
                    <>
                      <Separator orientation='vertical' className='mx-2 h-4' />
                      <Badge
                        variant='secondary'
                        className='rounded-sm px-1 font-normal lg:hidden'
                      >
                        {selectedValues.length}
                      </Badge>
                      <div className='w-full space-x-1'>
                        {(() => {
                          // Show the labels of what is selected. Previously,
                          // 2+ items collapsed into just "N selected" and there
                          // was no way to see the selection without reopening.
                          const selected = selectedValues
                            .map(value => ({
                              value,
                              label: knownLabels.get(value),
                            }))
                            .filter(
                              (o): o is ResolvedOption =>
                                typeof o.label === 'string'
                            )

                          // options not loaded yet: only the count is usable
                          if (selected.length === 0) {
                            return (
                              <Badge
                                variant='secondary'
                                className='rounded-sm px-1 font-normal'
                              >
                                {maxSelections
                                  ? t('business.selector.selectedOfMax', {
                                      count: selectedValues.length,
                                      max: maxSelections,
                                    })
                                  : t('business.selector.selected', {
                                      count: selectedValues.length,
                                    })}
                              </Badge>
                            )
                          }

                          const visible = selected.slice(0, MAX_VISIBLE_BADGES)
                          // count against selectedValues: a label not yet
                          // loaded disappears from the badge, not from the count
                          const overflow =
                            selectedValues.length - visible.length

                          return (
                            <>
                              {visible.map((option: ResolvedOption) => (
                                <Badge
                                  variant='secondary'
                                  key={option.value}
                                  className='rounded-sm px-1 font-normal'
                                >
                                  {option.label}
                                </Badge>
                              ))}
                              {overflow > 0 && (
                                <Badge
                                  variant='secondary'
                                  className='rounded-sm px-1 font-normal'
                                >
                                  +{overflow}
                                </Badge>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </>
                  ) : (
                    resolvedPlaceholder
                  )}
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={`${multiselectId}-listbox`}
            className='w-[var(--radix-popover-trigger-width)] p-0'
            side='bottom'
            align='start'
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={8}
          >
            <ScrollArea className='flex'>
              {/* shouldFilter=false: filtering belongs to loadOptions (server-side).
                  cmdk's client-side filter wiped out items mounted async. */}
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={t('business.selector.filterPlaceholder')}
                  className='h-9'
                  value={search}
                  onValueChange={setSearch}
                />
                {showCreateOption ? (
                  <div className='p-1'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='w-full justify-start text-sm text-muted-foreground'
                      onClick={handleCreateOption}
                      disabled={isCreating}
                      data-testid='multiselect-create-option-button'
                    >
                      {isCreating ? (
                        <>
                          <LoaderIcon className='mr-2 h-4 w-4 animate-spin' />
                          {t('business.selector.creating')}
                        </>
                      ) : (
                        <>
                          <PlusCircleIcon className='mr-2 h-4 w-4' />
                          {t('business.selector.createOption', {
                            value: search.trim(),
                          })}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <CommandEmpty>
                    {t('business.selector.noResultsFound')}
                  </CommandEmpty>
                )}
                <CommandList className='max-h-64 overflow-auto'>
                  <CommandGroup>
                    {data?.map((option: ResolvedOption) => {
                      const isSelected = selectedSet.has(option.value)
                      const isDisabled = !isSelected && isMaxSelectionsReached
                      return (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          role='option'
                          aria-selected={isSelected}
                          disabled={isDisabled}
                          onSelect={() => {
                            if (disabled || isDisabled) return

                            let filterValues: string[]

                            if (isSelected) {
                              filterValues = selectedValues.filter(
                                item => item !== option.value
                              )
                              announce(
                                t('business.selector.removed', {
                                  label: option.label,
                                })
                              )
                            } else {
                              filterValues = [...selectedValues, option.value]
                              announce(
                                t('business.selector.added', {
                                  label: option.label,
                                })
                              )
                            }

                            setSelectedValues(filterValues)
                            field.onChange(filterValues)
                          }}
                        >
                          <div
                            className={cn(
                              'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'opacity-50 [&_svg]:invisible',
                              isDisabled && 'opacity-30'
                            )}
                          >
                            <CheckIcon className={cn('h-4 w-4')} />
                          </div>
                          <span className={cn(isDisabled && 'opacity-50')}>
                            {option.label}
                          </span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  {isMaxSelectionsReached && (
                    <div className='p-2 text-xs text-center text-muted-foreground border-t'>
                      {t('business.selector.maxReached', {
                        max: maxSelections ?? 0,
                      })}
                    </div>
                  )}
                </CommandList>
              </Command>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {announceMessage && (
          <LiveRegion message={announceMessage} level='polite' />
        )}
      </div>
    )
  }
)

MultiSelect.displayName = 'MultiSelect'
