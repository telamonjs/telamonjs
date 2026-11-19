'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Command, defaultFilter } from 'cmdk'
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog'
import { Search } from 'lucide-react'
import { cn } from '../utils'
import { useTelamonjsT, useText } from '../i18n/use-t'
import type { I18nText } from '../i18n/msg'
import type { IconComponent } from '../types/menu'

export interface CommandPaletteItem {
  /**
   * Unique item ID
   */
  id: string

  /**
   * Display label
   */
  label: I18nText

  /**
   * Item type (for grouping)
   */
  type: 'navigation' | 'action' | 'search' | 'recent'

  /**
   * Icon component
   */
  icon?: IconComponent

  /**
   * Keyboard shortcut display
   */
  shortcut?: string

  /**
   * Search keywords (for fuzzy search)
   */
  keywords?: string[]

  /**
   * Action to execute when selected
   */
  onSelect?: () => void

  /**
   * Href for navigation items
   */
  href?: string

  /**
   * Is this item disabled?
   */
  disabled?: boolean
}

export interface CommandPaletteProps {
  /**
   * Command items to display
   */
  items: CommandPaletteItem[]

  /**
   * Callback when item is selected
   */
  onSelect?: (item: CommandPaletteItem) => void

  /**
   * Search placeholder text
   * @default t('shell.searchPlaceholder')
   */
  placeholder?: I18nText

  /**
   * Controlled open state
   */
  open?: boolean

  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void

  /**
   * Enable keyboard shortcut (Cmd+K / Ctrl+K)
   * @default true
   */
  enableShortcut?: boolean

  /**
   * Shortcut key
   * @default 'k'
   */
  shortcutKey?: string

  /**
   * Additional CSS classes
   */
  className?: string
}

/** Lowercase + strip diacritics: "manutencao" matches "Manutenção". */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** cmdk's fuzzy scoring, accent-insensitive. */
const accentInsensitiveFilter = (
  value: string,
  search: string,
  keywords?: string[]
) => defaultFilter(fold(value), fold(search), keywords?.map(fold))

/**
 * CommandPalette - Cmd+K command palette
 *
 * Quick navigation and action execution with fuzzy search.
 *
 * @example
 * ```tsx
 * const items: CommandItem[] = [
 *   {
 *     id: 'dashboard',
 *     label: 'Dashboard',
 *     type: 'navigation',
 *     icon: Home,
 *     href: '/admin',
 *   },
 *   {
 *     id: 'new-user',
 *     label: 'Create New User',
 *     type: 'action',
 *     icon: UserPlus,
 *     onSelect: () => router.push('/admin/users/add'),
 *     shortcut: '⌘N',
 *   },
 * ]
 *
 * <CommandPalette
 *   items={items}
 *   onSelect={(item) => console.log('Selected:', item.label)}
 * />
 * ```
 */
export function CommandPalette({
  items,
  onSelect,
  placeholder,
  open: controlledOpen,
  onOpenChange,
  enableShortcut = true,
  shortcutKey = 'k',
  className,
}: CommandPaletteProps) {
  const t = useTelamonjsT()
  const text = useText()
  const effectivePlaceholder = text(placeholder) ?? t('shell.searchPlaceholder')
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  // Every opening starts from an empty query (adjusting state on prop change)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSearch('')
  }

  const setOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextValue = typeof value === 'function' ? value(open) : value

      if (isControlled) {
        onOpenChange?.(nextValue)
      } else {
        setInternalOpen(nextValue)
      }
    },
    [isControlled, onOpenChange, open]
  )

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    if (!enableShortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === shortcutKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prevOpen: boolean) => !prevOpen)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableShortcut, shortcutKey, setOpen])

  // Handle item selection
  const handleSelect = useCallback(
    (item: CommandPaletteItem) => {
      // Execute item's onSelect if exists
      item.onSelect?.()

      // Call parent onSelect callback
      onSelect?.(item)

      // Close palette
      setOpen(false)
    },
    [onSelect, setOpen]
  )

  // Group items by type — disabled items are not offered at all
  const groupedItems = items
    .filter(item => !item.disabled)
    .reduce(
      (acc, item) => {
        if (!acc[item.type]) {
          acc[item.type] = []
        }
        acc[item.type].push(item)
        return acc
      },
      {} as Record<string, CommandPaletteItem[]>
    )

  const groupLabels: Record<string, string> = {
    navigation: t('navigation.navigationGroupLabel'),
    action: t('common.actions'),
    search: t('navigation.searchGroupLabel'),
    recent: t('shell.recent'),
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn('overflow-hidden p-0 shadow-lg', className)}
        onOpenAutoFocus={e => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <DialogTitle className='sr-only'>
          {t('navigation.commandPaletteTitle')}
        </DialogTitle>
        <Command
          filter={accentInsensitiveFilter}
          className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5'
        >
          <div className='flex items-center border-b px-3'>
            <Search className='mr-2 h-4 w-4 shrink-0 opacity-50' />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              className='flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none ring-0 focus:ring-0 focus:outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50'
              placeholder={effectivePlaceholder}
            />
          </div>

          <Command.List className='max-h-[400px] overflow-y-auto overflow-x-hidden'>
            <Command.Empty className='py-6 text-center text-sm'>
              {t('shell.noResults')}
            </Command.Empty>

            {Object.entries(groupedItems).map(([type, groupItems]) => (
              <Command.Group key={type} heading={groupLabels[type] || type}>
                {groupItems.map(item => {
                  const Icon = item.icon
                  const label = text(item.label) ?? ''

                  return (
                    <Command.Item
                      key={item.id}
                      value={label}
                      keywords={item.keywords}
                      onSelect={() => handleSelect(item)}
                      className='flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                    >
                      {Icon && <Icon className='h-4 w-4' />}
                      <span className='flex-1'>{label}</span>
                      {item.shortcut && (
                        <kbd className='pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
                          {item.shortcut}
                        </kbd>
                      )}
                    </Command.Item>
                  )
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
