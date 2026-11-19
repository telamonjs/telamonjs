'use client'

import { cn } from '../../utils'
import { Check, ChevronsUpDown, LoaderIcon, Search } from 'lucide-react'
import { forwardRef, useState, useEffect, useRef } from 'react'
import { ControllerRenderProps, useFormContext } from 'react-hook-form'
import { Button } from '../../ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '../../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { resolveLabel, useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import { useDependentValue } from '../../hooks/use-dependent-value'

interface ComboboxProps {
  field: ControllerRenderProps
  loadOptions: (
    search?: string,
    id?: string,
    dependsOn?: string
  ) => Promise<IOption[]>
  dependsOn?: string
  autoFocus?: boolean
  disabled?: boolean
  label?: string
  placeholder?: string
  className?: string
}

export interface IOption {
  value: string | bigint | number
  /** Literal or `msg()` (I18nText) — resolved once when the options load. */
  label: I18nText
}

type ResolvedOption = Omit<IOption, 'label'> & { label: string }

export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      field,
      loadOptions,
      dependsOn,
      autoFocus = false,
      disabled = false,
      label,
      placeholder,
      className,
    },
    ref
  ) => {
    const t = useTelamonjsT()
    const text = useText()
    const resolvedPlaceholder =
      placeholder ?? t('business.selector.choosePlaceholder')
    const [open, setOpen] = useState(false)
    // Auto-open on focus is for keyboard (Tab into an empty field) only:
    // - a click focuses first and then toggles (Radix) — opening on that focus
    //   made the click close the list again
    // - closing returns focus to the trigger (always, in a modal popover inside
    //   a Dialog) — reopening on it trapped the user in an empty field
    const skipFocusOpen = useRef(false)
    const [search, setSearch] = useState('')
    const [options, setOptions] = useState<ResolvedOption[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Value of the `dependsOn` field; outside a FormProvider the field name
    // itself is passed through (backward compatibility).
    const inForm = useFormContext() != null
    const watchedValue = useDependentValue(dependsOn)
    // `any` kept intentionally: the watched field's runtime value depends on
    // the form schema — genuinely heterogeneous.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dependentValue: any = inForm && dependsOn ? watchedValue : dependsOn

    // Latest field value without making it a fetch dependency: selecting an
    // option must not trigger a refetch (it is only needed to resolve the
    // selected label on load).
    const fieldValueRef = useRef(field.value)
    fieldValueRef.current = field.value

    // Debounced load (typing) with a stale-response guard.
    useEffect(() => {
      let ignore = false
      const loadData = async () => {
        try {
          setLoading(true)
          setError(null)
          // Pass the actual value of the dependent field, not just the field name
          const data = await loadOptions(
            search,
            fieldValueRef.current || undefined,
            dependentValue
          )
          if (ignore) return
          setOptions((data || []).map(o => resolveLabel(text, o)))
        } catch (err) {
          if (ignore) return
          setError(
            err instanceof Error
              ? err.message
              : t('business.selector.loadError')
          )
          setOptions([])
        } finally {
          if (!ignore) setLoading(false)
        }
      }

      // Same 300ms as MultiSelect; initial/empty-search load stays immediate.
      const timeoutId = setTimeout(loadData, search ? 300 : 0)
      return () => {
        ignore = true
        clearTimeout(timeoutId)
      }
    }, [search, dependentValue, loadOptions, t, text])

    // Auto focus if needed
    useEffect(() => {
      if (autoFocus && ref && typeof ref === 'object' && ref.current) {
        ref.current.focus()
      }
    }, [autoFocus, ref])

    if (error) {
      return (
        <div className='p-2 text-sm text-red-600 dark:text-red-400 border border-red-200 rounded-md bg-red-50 dark:bg-red-950/30'>
          {t('business.selector.errorPrefix', { message: error })}
        </div>
      )
    }

    const selectedOption = options.find(
      (item: ResolvedOption) =>
        item.value === field.value || item.value === field.value?.id
    )

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label={
              label ||
              t('business.selector.comboboxLabel', { name: field.name })
            }
            disabled={disabled}
            className={cn(
              'w-full justify-between truncate bg-card drop-shadow-md',
              className
            )}
            onPointerDown={() => {
              skipFocusOpen.current = true
            }}
            onPointerUp={() => {
              skipFocusOpen.current = false
            }}
            onFocus={() => {
              if (skipFocusOpen.current) return
              if (!field.value) setOpen(true)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !open) {
                e.preventDefault()
                setOpen(true)
              }
              if (e.key === 'Escape' && open) {
                setOpen(false)
              }
              if (e.key === 'ArrowDown' && !open) {
                e.preventDefault()
                setOpen(true)
              }
            }}
          >
            {loading ? (
              <LoaderIcon className='animate-spin h-4 w-4' />
            ) : (
              selectedOption?.label || resolvedPlaceholder
            )}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          onCloseAutoFocus={() => {
            // Radix focuses the trigger synchronously right after this handler
            skipFocusOpen.current = true
            setTimeout(() => {
              skipFocusOpen.current = false
            })
          }}
          className='w-[var(--radix-popover-trigger-width)] bg-popover p-0'
          side='bottom'
          align='start'
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={8}
          onWheel={e => {
            e.stopPropagation()
          }}
        >
          <Command shouldFilter={false}>
            <div
              className='flex items-center border-b px-3'
              cmdk-input-wrapper=''
            >
              <Search className='mr-2 h-4 w-4 shrink-0 opacity-50' />
              <input
                aria-label={t('business.selector.searchAria')}
                className='flex h-11 w-full select-none rounded-md border-none bg-transparent py-3 text-sm shadow-none outline-none ring-offset-0 placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50'
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('business.selector.searchPlaceholder')}
              />
            </div>
            {loading ? (
              <CommandList className='max-h-64 overflow-auto'>
                <CommandEmpty className='flex items-center justify-center py-6 text-sm text-muted-foreground'>
                  <LoaderIcon className='mr-2 h-4 w-4 animate-spin' />
                  {t('business.selector.searching')}
                </CommandEmpty>
              </CommandList>
            ) : (
              <CommandList className='max-h-64 overflow-auto'>
                <CommandEmpty className='flex items-center justify-center py-6 text-sm text-muted-foreground'>
                  {t('business.selector.noOptions')}
                </CommandEmpty>
                <CommandGroup>
                  {options.map((item: ResolvedOption, idx: number) => (
                    <CommandItem
                      key={idx}
                      role='option'
                      aria-selected={field.value === item.value}
                      onSelect={() => {
                        field.onChange(item.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          field.value === item.value
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)

Combobox.displayName = 'Combobox'
