'use client'

import { prefetchCreateDialog } from './prefetch-create-dialog'
import { Fragment, useMemo, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { TabToolbar } from '../../components/toolbar/TabToolbar'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { isMessageRef, msg } from '../../i18n/msg'
import { usesCount } from '../../i18n/uses-count'
import type {
  ListConfig,
  ToolbarConfig,
  ToolbarFilterConfig,
} from '../../types/crud'
import { ExportMenu } from '../../data/ExportMenu'
import type { DataTableExportMenuProps } from '../../data/datatable/types'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { DropdownMenuItem } from '../../ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { cn } from '../../utils'
import { useHoverPopover } from '../../hooks/use-hover-popover'
import { MoreHorizontal, RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import { resolveColumns } from './resolve-columns'
import type { ActiveFilterChip } from './types'

/**
 * Counter label → `TabToolbar.Counter` props. A MessageRef whose message uses `{count}` (ICU plural)
 * gets `count` injected and renders on its own; anything else keeps the `"{n} label"` prefix.
 */
function useCounterLabel(counterLabel: ToolbarConfig['counterLabel']): {
  label: string | ((count: number) => string)
  countIncluded: boolean
} {
  const t = useTelamonjsT()
  const text = useText()
  const tAll = useTranslations()
  if (!counterLabel)
    return {
      label: n => t('list.resultsCount', { count: n }),
      countIncluded: true,
    }
  if (typeof counterLabel === 'function')
    return { label: counterLabel, countIncluded: false }
  if (
    isMessageRef(counterLabel) &&
    usesCount(
      tAll.has(counterLabel.key as never)
        ? tAll.raw(counterLabel.key as never)
        : null
    )
  ) {
    const { key, values } = counterLabel
    return {
      label: n => text(msg(key, { ...values, count: n })) ?? '',
      countIncluded: true,
    }
  }
  return { label: text(counterLabel) ?? '', countIncluded: false }
}

interface ListPageToolbarProps<TData> {
  list: ListConfig<TData>
  /** Custom React content to render BEFORE search (e.g. DateRange picker) */
  toolbarPrepend?: ReactNode
  /** Custom React content to render after filters, before Spacer */
  toolbarContent?: ReactNode
  /** Debounced local search value */
  localSearch: string
  onSearchChange: (value: string) => void
  /** Active declarative toolbar filters */
  toolbarFilters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  /** Unified total (works for both paginated and infinite modes) */
  total: number
  /** Unified loading (works for both modes) */
  loading: boolean
  /** Unified isFetching (works for both modes) */
  isFetching: boolean
  /** True when dialogs.create is configured */
  showAddButton: boolean
  onAdd: () => void
  onRefresh: () => Promise<void>
  /** Rows currently loaded (export source when `list.enableExport`). */
  exportData?: TData[]
  /** Base name of the exported file (default: module name). */
  exportFilename?: string
  /** Export menu extras from `useListPageExport` (`loadAll`, `onServerExport`, formats) */
  exportMenu?: DataTableExportMenuProps<TData>
  /** "Filters" popover content (second level) */
  filtersPanel?: ReactNode
  /** Chips of the active `filtersPanel` filters */
  activeFilters?: ActiveFilterChip[]
  onClearFilters?: () => void
}

/**
 * ListPageToolbar - Embedded TabToolbar for ListPage (internal)
 *
 * Renders search, declarative filters, counter, add and refresh
 * controls when ListPage is in embedded mode.
 *
 * @internal Extracted from ListPage during the god-component decomposition.
 */
export function ListPageToolbar<TData>({
  list,
  toolbarPrepend,
  toolbarContent,
  localSearch,
  onSearchChange,
  toolbarFilters,
  onFilterChange,
  total,
  loading,
  isFetching,
  showAddButton,
  onAdd,
  onRefresh,
  exportData,
  exportFilename,
  exportMenu,
  filtersPanel,
  activeFilters = [],
  onClearFilters,
}: ListPageToolbarProps<TData>) {
  const t = useTelamonjsT()
  const text = useText()
  // "Filtros" opens on hover like the other toolbar dropdowns
  const {
    open: filtersOpen,
    setOpen: setFiltersOpen,
    triggerProps: filtersTriggerProps,
    contentProps: filtersContentProps
  } = useHoverPopover()
  const counter = useCounterLabel(list.toolbar?.counterLabel)
  // `onExport` alone shows the menu too (the app exports; no rows needed)
  const exportEnabled = Boolean(list.enableExport || list.onExport)
  const exportColumns = useMemo(
    () => (exportEnabled ? resolveColumns(list.columns, text) : []),
    [exportEnabled, list.columns, text]
  )
  // Options marked `more` live in the Filters panel; the active one is a chip
  const moreFilters = (list.toolbar?.filters ?? [])
    .map(f => ({ f, more: f.options.filter(o => o.more) }))
    .filter(x => x.more.length > 0)
  // "No filter" choice: `allValue` when declared, else the first option
  const resetOf = (f: ToolbarFilterConfig) =>
    f.allValue ?? f.options[0]?.value ?? ''
  const valueOf = (f: ToolbarFilterConfig) =>
    toolbarFilters[f.key] || f.defaultValue || resetOf(f)
  const moreChips: ActiveFilterChip[] = moreFilters.flatMap(({ f, more }) => {
    const active = more.find(o => o.value === valueOf(f))
    return active
      ? [
          {
            key: f.key,
            label: `${text(f.label)}: ${text(active.label)}`,
            onRemove: () => onFilterChange(f.key, resetOf(f)),
          },
        ]
      : []
  })
  const chips = [...moreChips, ...activeFilters]
  const showFiltersButton = Boolean(filtersPanel) || moreFilters.length > 0
  const actionsMenu = list.toolbar?.actionsMenu && exportEnabled

  return (
    <>
      <TabToolbar>
        {toolbarPrepend}

        {list.toolbar?.showSearch !== false && (
          <TabToolbar.Search
            placeholder={text(list.searchPlaceholder) || t('list.search')}
            value={localSearch}
            onChange={onSearchChange}
            className='ml-0 col-span-2 lg:col-span-1 lg:flex-none lg:shrink-0 lg:w-64'
          />
        )}

        {/* Filters row (col-span-2 on mobile grid, transparent on desktop) */}
        {list.toolbar?.filters && list.toolbar.filters.length > 0 && (
          <div className='flex items-center gap-2 col-span-2 lg:contents'>
            {list.toolbar.filters.map((filter, index) => {
              const resolvedOptions = filter.options.map(o => ({
                ...o,
                label: text(o.label) ?? '',
              }))
              return (
                <Fragment key={filter.key}>
                  {index > 0 && (
                    <div className='w-px h-5 bg-border self-center hidden lg:block' />
                  )}
                  {filter.displayMode === 'select' ? (
                    <TabToolbar.FilterSelect
                      options={resolvedOptions}
                      value={valueOf(filter)}
                      onChange={value => onFilterChange(filter.key, value)}
                      label={text(filter.label)}
                      className={filter.className}
                    />
                  ) : (
                    // eslint-disable-next-line telamonjs-accessibility/button-accessibility -- FilterButtons renders its own per-option data-testid internally (TabToolbar.tsx)
                    <TabToolbar.FilterButtons
                      options={resolvedOptions.filter(o => !o.more)}
                      value={valueOf(filter)}
                      onChange={value => onFilterChange(filter.key, value)}
                      className={filter.className}
                      allValue={filter.allValue}
                    />
                  )}
                </Fragment>
              )
            })}
          </div>
        )}

        {toolbarContent}

        {showFiltersButton && (
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild {...filtersTriggerProps}>
              <Button
                variant='outline'
                size='sm'
                className='h-8 gap-1.5 shrink-0'
                data-testid='list-filters-trigger'
              >
                <SlidersHorizontal className='h-4 w-4' />
                {t('list.filters')}
                {chips.length > 0 && (
                  <Badge className='h-5 min-w-5 px-1.5'>{chips.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align='start'
              className='w-80 space-y-4'
              {...filtersContentProps}
            >
              {moreFilters.map(({ f, more }) => {
                const current = valueOf(f)
                return (
                  <div key={f.key} className='space-y-1.5'>
                    <div className='text-xs font-medium text-muted-foreground'>
                      {text(f.label)}
                    </div>
                    <div className='flex flex-wrap gap-1.5'>
                      {more.map(o => (
                        <Button
                          key={o.value}
                          data-testid={`list-filter-option-${f.key}-${o.value}`}
                          variant='outline'
                          size='sm'
                          className={cn(
                            'h-7 gap-1.5',
                            current === o.value &&
                              (o.activeClass || 'bg-muted font-semibold')
                          )}
                          onClick={() =>
                            onFilterChange(
                              f.key,
                              current === o.value ? resetOf(f) : o.value
                            )
                          }
                        >
                          {o.dot && (
                            <span
                              className={cn('h-2 w-2 rounded-full', o.dot)}
                            />
                          )}
                          {text(o.label)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )
              })}
              {filtersPanel}
            </PopoverContent>
          </Popover>
        )}

        {/* Trailing controls: one flex row spanning the mobile grid, transparent on desktop.
          Without this wrapper Refresh/Add become stretched grid cells below `lg`. */}
        <div className='flex items-center gap-2 col-span-2 lg:contents'>
          <TabToolbar.Spacer />

          {list.toolbar?.showCounter !== false && (
            <TabToolbar.Counter
              count={total}
              label={counter.label}
              countIncluded={counter.countIncluded}
              loading={loading}
            />
          )}

          {/* Export (Excel/CSV/PDF, locale-aware) — the TabToolbar path had none since
            infinite became the default; DataTable's paginated toolbar always had it. */}
          {exportEnabled && !actionsMenu && (
            <ExportMenu<TData>
              data={exportData ?? []}
              columns={exportColumns}
              currentPageRows={exportData ?? []}
              filename={list.exportFilename || exportFilename}
              formats={list.exportFormats}
              {...exportMenu}
              className='h-8'
            />
          )}

          {showAddButton && (
            // eslint-disable-next-line telamonjs-accessibility/button-accessibility -- AddButton hardcodes its own data-testid internally (TabToolbar.tsx)
            <TabToolbar.AddButton
              onClick={onAdd}
              onPrefetch={prefetchCreateDialog}
            />
          )}

          {list.toolbar?.showRefresh !== false && !actionsMenu && (
            <TabToolbar.Refresh onClick={onRefresh} loading={isFetching} />
          )}

          {/* Third level: export + refresh in one "⋯" menu */}
          {actionsMenu && (
            <ExportMenu<TData>
              data={exportData ?? []}
              columns={exportColumns}
              currentPageRows={exportData ?? []}
              filename={list.exportFilename || exportFilename}
              formats={list.exportFormats}
              {...exportMenu}
              trigger={
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 w-8 p-0 shrink-0'
                  aria-label={t('list.moreActions')}
                  title={t('list.moreActions')}
                  data-testid='list-actions-menu'
                >
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              }
            >
              {list.toolbar?.showRefresh !== false && (
                <DropdownMenuItem onClick={() => void onRefresh()}>
                  <RefreshCw
                    className={cn('h-4 w-4', isFetching && 'animate-spin')}
                  />
                  <span className='ml-2'>{t('list.refresh')}</span>
                </DropdownMenuItem>
              )}
            </ExportMenu>
          )}
        </div>
      </TabToolbar>

      {/* Active filters: what is cutting the list, removable one by one */}
      {chips.length > 0 && (
        <div
          className='flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b'
          data-testid='list-active-filters'
        >
          {chips.map(c => (
            <Badge
              key={c.key}
              variant='secondary'
              className='gap-1 pr-1 font-normal'
            >
              {c.label}
              <button
                type='button'
                onClick={c.onRemove}
                aria-label={`${t('list.clearFilters')}: ${c.label}`}
                className='rounded-sm p-0.5 hover:bg-muted-foreground/20'
              >
                <X className='h-3 w-3' />
              </button>
            </Badge>
          ))}
          <Button
            data-testid='list-clear-filters'
            variant='link'
            size='sm'
            className='h-6 px-1 text-xs'
            onClick={() => {
              moreChips.forEach(c => c.onRemove())
              onClearFilters?.()
            }}
          >
            {t('list.clearFilters')}
          </Button>
        </div>
      )}
    </>
  )
}
