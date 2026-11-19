import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import {
  MoreVertical,
  Grid3X3,
  List,
  Filter,
  Download,
  Settings2,
  Eye,
} from 'lucide-react'
import { cn } from '../../utils'
import { useTelamonjsT } from '../../i18n/use-t'
import { Table } from '@tanstack/react-table'
import { getColumnLabel } from '../../data/column-label'

type ViewMode = 'table' | 'cards'
type Density = 'compact' | 'comfortable' | 'spacious'

interface ToolbarActionsMenuProps {
  // View mode
  currentViewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  enableMobileCards?: boolean

  // Density
  currentDensity: Density
  onDensityChange: (density: Density) => void
  enableDensity?: boolean

  // Actions
  enableFilters?: boolean
  onToggleFilters?: () => void
  filtersActive?: boolean

  enableExport?: boolean
  onExport?: () => void

  enableColumnVisibility?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Table<T> is invariant in TanStack; accepting any instance requires any (unknown breaks generic call-sites)
  table?: Table<any>

  // Custom header actions
  headerActions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
    loading?: boolean
  }>

  // Control whether to show header actions in menu (false = only show on small screens)
  showHeaderActionsInMenu?: boolean
}

/**
 * Dropdown menu (⋮) with all secondary toolbar actions
 * Keeps the toolbar clean with only primary actions visible
 */
export function ToolbarActionsMenu({
  currentViewMode,
  onViewModeChange,
  enableMobileCards = true,
  currentDensity,
  onDensityChange,
  enableDensity = true,
  enableFilters = false,
  onToggleFilters,
  filtersActive = false,
  enableExport = false,
  onExport,
  enableColumnVisibility = false,
  table,
  headerActions = [],
  showHeaderActionsInMenu = false,
}: ToolbarActionsMenuProps) {
  const t = useTelamonjsT()
  const [columnsOpen, setColumnsOpen] = React.useState(false)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-8 w-8 p-0'
          title={t('list.moreActions')}
          aria-label={t('list.moreActions')}
        >
          <MoreVertical className='h-4 w-4' />
          <span className='sr-only'>{t('list.moreActions')}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-56'>
        {/* View Mode Section */}
        {enableMobileCards && (
          <>
            <DropdownMenuItem onClick={() => onViewModeChange('table')}>
              <List className='mr-2 h-4 w-4' />
              {t('list.viewAsTable')}
              {currentViewMode === 'table' && (
                <span className='ml-auto text-xs'>✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewModeChange('cards')}>
              <Grid3X3 className='mr-2 h-4 w-4' />
              {t('list.viewAsCards')}
              {currentViewMode === 'cards' && (
                <span className='ml-auto text-xs'>✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Data Actions Section */}
        {enableFilters && onToggleFilters && (
          <DropdownMenuItem onClick={onToggleFilters}>
            <Filter className='mr-2 h-4 w-4' />
            {t('list.filters')}
            {filtersActive && (
              <Badge className='ml-auto h-5 px-1.5 text-xs' variant='secondary'>
                {t('list.active')}
              </Badge>
            )}
          </DropdownMenuItem>
        )}

        {enableExport && onExport && (
          <DropdownMenuItem onClick={onExport}>
            <Download className='mr-2 h-4 w-4' />
            {t('list.exportCsv')}
          </DropdownMenuItem>
        )}

        {/* Custom header actions (only show in menu on small screens when showHeaderActionsInMenu is true) */}
        {showHeaderActionsInMenu &&
          headerActions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              onClick={action.onClick}
              disabled={action.loading}
              className={cn(
                'lg:hidden',
                action.variant === 'destructive' &&
                  'text-destructive focus:text-destructive'
              )}
            >
              {action.icon &&
                React.cloneElement(
                  action.icon as React.ReactElement<{ className?: string }>,
                  {
                    className: cn(
                      'mr-2 h-4 w-4',
                      action.loading && 'animate-spin'
                    ),
                  }
                )}
              {action.label}
            </DropdownMenuItem>
          ))}

        {(enableFilters ||
          enableExport ||
          (showHeaderActionsInMenu && headerActions.length > 0)) && (
          <DropdownMenuSeparator />
        )}

        {/* Table Settings Section (only in table view) */}
        {currentViewMode === 'table' && (
          <>
            {enableColumnVisibility && table && (
              <DropdownMenuSub open={columnsOpen} onOpenChange={setColumnsOpen}>
                <DropdownMenuSubTrigger>
                  <Eye className='mr-2 h-4 w-4' />
                  {t('list.columns')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {table
                    .getAllColumns()
                    .filter(column => column.getCanHide())
                    .map(column => (
                      <DropdownMenuItem
                        key={column.id}
                        onClick={e => {
                          e.preventDefault()
                          column.toggleVisibility(!column.getIsVisible())
                        }}
                      >
                        <input
                          type='checkbox'
                          checked={column.getIsVisible()}
                          onChange={() => {}}
                          className='mr-2 h-4 w-4'
                        />
                        {getColumnLabel(column.columnDef) ?? column.id}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            {enableDensity && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Settings2 className='mr-2 h-4 w-4' />
                  {t('list.density')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onDensityChange('compact')}>
                    {t('list.densityCompact')}
                    {currentDensity === 'compact' && (
                      <span className='ml-auto text-xs'>✓</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDensityChange('comfortable')}
                  >
                    {t('list.densityComfortable')}
                    {currentDensity === 'comfortable' && (
                      <span className='ml-auto text-xs'>✓</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDensityChange('spacious')}>
                    {t('list.densitySpacious')}
                    {currentDensity === 'spacious' && (
                      <span className='ml-auto text-xs'>✓</span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
