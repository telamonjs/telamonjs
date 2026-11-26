/**
 * ViewsMenu Component
 *
 * Dropdown menu for managing saved table views (column visibility, sorting, filters, etc.)
 * Allows users to save, load, rename, delete, and share custom views.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { logger } from '../utils/logger'
import {
  Save,
  Eye,
  Trash2,
  Edit2,
  Copy,
  Star,
  StarOff,
  Share2,
  Upload,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '../ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { toast } from 'sonner'
import { useTelamonjsT } from '../i18n/use-t'
import {
  SavedView,
  loadViews,
  saveView,
  deleteView,
  setDefaultView,
  getDefaultView,
  renameView as renameViewInStorage,
  duplicateView as duplicateViewInStorage,
  createView,
  importViewFromJSON,
  encodeViewConfig,
  decodeViewConfig,
  SHARED_VIEW_PARAM,
} from './viewsManager'
import { VisibilityState } from '@tanstack/react-table'
import { SortField } from '../types/pagination'
import { QueryGroup } from './queryBuilderUtils'

export interface ViewsMenuProps {
  tableId: string
  currentConfig: {
    columnVisibility: VisibilityState
    columnOrder: string[]
    columnSizing: Record<string, number>
    sorting: SortField[]
    filters: {
      search?: string
      queryBuilder?: QueryGroup
      columnFilters?: Record<string, unknown>
    }
  }
  onLoadView: (view: SavedView) => void
  onResetToDefault?: () => void
  className?: string
  disabled?: boolean
}

export function ViewsMenu({
  tableId,
  currentConfig,
  onLoadView,
  onResetToDefault,
  className,
  disabled = false,
}: ViewsMenuProps) {
  const t = useTelamonjsT()
  const [views, setViews] = useState<SavedView[]>(() => loadViews(tableId))
  const [loadedTableId, setLoadedTableId] = useState(tableId)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  const [newViewName, setNewViewName] = useState('')
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [viewToRename, setViewToRename] = useState<SavedView | null>(null)
  const [viewToShare, setViewToShare] = useState<SavedView | null>(null)
  const [importJSON, setImportJSON] = useState('')

  const refreshViews = useCallback(() => {
    const loadedViews = loadViews(tableId)
    setViews(loadedViews)
  }, [tableId])

  // Reload views when tableId changes — compare against the previous value
  // in render instead of an effect.
  if (tableId !== loadedTableId) {
    setLoadedTableId(tableId)
    setViews(loadViews(tableId))
  }

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast.error(t('list.viewNameRequired'))
      return
    }

    try {
      const view = createView(
        tableId,
        newViewName.trim(),
        currentConfig,
        setAsDefault
      )

      if (setAsDefault) {
        setDefaultView(tableId, view.id)
      }

      refreshViews()
      toast.success(t('list.viewSaved', { name: newViewName }))
      setSaveDialogOpen(false)
      setNewViewName('')
      setSetAsDefault(false)
    } catch (error) {
      toast.error(t('list.viewSaveError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  const handleLoadView = (view: SavedView) => {
    try {
      onLoadView(view)
      toast.success(t('list.viewLoaded', { name: view.name }))
    } catch (error) {
      toast.error(t('list.viewLoadError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  // A shared link (?sharedView=...) applies once on mount, then leaves the URL
  useEffect(() => {
    const url = new URL(window.location.href)
    const encoded = url.searchParams.get(SHARED_VIEW_PARAM)
    if (!encoded) return
    url.searchParams.delete(SHARED_VIEW_PARAM)
    window.history.replaceState(window.history.state, '', url.toString())
    const config = decodeViewConfig(encoded)
    if (!config) {
      toast.error(t('list.sharedViewInvalid'))
      return
    }
    const now = new Date()
    handleLoadView({ id: 'shared', name: t('list.sharedViewName'), isDefault: false, config, createdAt: now, updatedAt: now })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, [])

  const handleDeleteView = (view: SavedView) => {
    try {
      deleteView(tableId, view.id)
      refreshViews()
      toast.success(t('list.viewDeleted', { name: view.name }))
    } catch (error) {
      toast.error(t('list.viewDeleteError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  const handleSetDefault = (view: SavedView) => {
    try {
      setDefaultView(tableId, view.id)
      refreshViews()
      toast.success(t('list.viewSetAsDefault', { name: view.name }))
    } catch (error) {
      toast.error(t('list.viewSetDefaultError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  const handleUnsetDefault = (view: SavedView) => {
    try {
      // Create a copy without default flag
      const updatedView = { ...view, isDefault: false }
      saveView(tableId, updatedView)
      refreshViews()
      toast.success(t('list.defaultViewRemoved'))
    } catch (error) {
      toast.error(t('list.removeDefaultError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  const handleRenameView = () => {
    if (!viewToRename || !newViewName.trim()) {
      toast.error(t('list.newNameRequired'))
      return
    }

    try {
      renameViewInStorage(tableId, viewToRename.id, newViewName.trim())
      refreshViews()
      toast.success(t('list.viewRenamed'))
      setRenameDialogOpen(false)
      setViewToRename(null)
      setNewViewName('')
    } catch (error) {
      toast.error(t('list.viewRenameError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  const handleDuplicateView = (view: SavedView) => {
    try {
      const newView = duplicateViewInStorage(tableId, view.id, undefined, t('list.duplicateSuffix'))
      refreshViews()
      toast.success(t('list.viewDuplicated', { name: newView.name }))
    } catch (error) {
      toast.error(t('list.viewSaveError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  const handleImportView = () => {
    if (!importJSON.trim()) {
      toast.error(t('list.viewImportJsonRequired'))
      return
    }

    try {
      const view = importViewFromJSON(tableId, importJSON.trim())
      refreshViews()
      toast.success(t('list.viewImported', { name: view.name }))
      setImportDialogOpen(false)
      setImportJSON('')
    } catch (error) {
      toast.error(t('list.viewImportError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  const handleCopyShareURL = () => {
    if (!viewToShare) return

    try {
      const encoded = encodeViewConfig(viewToShare.config)
      const url = `${window.location.origin}${window.location.pathname}?${SHARED_VIEW_PARAM}=${encoded}`

      navigator.clipboard.writeText(url)
      toast.success(t('list.linkCopied'))
      setShareDialogOpen(false)
      setViewToShare(null)
    } catch (error) {
      toast.error(t('list.shareLinkError'))
      logger.error('Error', {
        error: error instanceof Error ? error : String(error),
      })
    }
  }

  const handleResetToDefault = () => {
    if (onResetToDefault) {
      onResetToDefault()
      toast.success(t('list.viewReset'))
    } else {
      const defaultView = getDefaultView(tableId)
      if (defaultView) {
        handleLoadView(defaultView)
      } else {
        toast.info(t('list.noDefaultView'))
      }
    }
  }

  const defaultView = views.find(v => v.isDefault)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className={className}
            disabled={disabled}
            data-testid='views-menu-trigger'
          >
            <Eye className='h-4 w-4' />
            <span className='ml-1.5'>{t('list.views')}</span>
            {views.length > 0 && (
              <Badge variant='secondary' className='ml-1.5 h-5 px-1.5 text-xs'>
                {views.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-64'>
          <DropdownMenuLabel>{t('list.savedViews')}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Current views list */}
          {views.length > 0 ? (
            <DropdownMenuGroup>
              {views.map(view => (
                <div
                  key={view.id}
                  className='group flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-sm'
                >
                  <button
                    onClick={() => handleLoadView(view)}
                    className='flex-1 flex items-center gap-2 text-sm text-left'
                    data-testid={`view-item-${view.id}`}
                  >
                    <Eye className='h-3.5 w-3.5 text-muted-foreground' />
                    <span className='truncate'>{view.name}</span>
                    {view.isDefault && (
                      <Badge variant='default' className='h-4 px-1 text-xs'>
                        {t('list.defaultBadge')}
                      </Badge>
                    )}
                  </button>

                  <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    {view.isDefault ? (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={e => {
                          e.stopPropagation()
                          handleUnsetDefault(view)
                        }}
                        title={t('list.removeDefault')}
                        aria-label={t('list.removeDefault')}
                      >
                        <StarOff className='h-3 w-3' />
                      </Button>
                    ) : (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={e => {
                          e.stopPropagation()
                          handleSetDefault(view)
                        }}
                        title={t('list.setAsDefault')}
                        aria-label={t('list.setAsDefault')}
                      >
                        <Star className='h-3 w-3' />
                      </Button>
                    )}

                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={e => {
                        e.stopPropagation()
                        setViewToRename(view)
                        setNewViewName(view.name)
                        setRenameDialogOpen(true)
                      }}
                      title={t('list.rename')}
                      aria-label={t('list.renameViewTitle')}
                    >
                      <Edit2 className='h-3 w-3' />
                    </Button>

                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={e => {
                        e.stopPropagation()
                        handleDuplicateView(view)
                      }}
                      title={t('list.duplicate')}
                      aria-label={t('list.duplicate')}
                    >
                      <Copy className='h-3 w-3' />
                    </Button>

                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6'
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteView(view)
                      }}
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className='h-3 w-3 text-destructive' />
                    </Button>
                  </div>
                </div>
              ))}
            </DropdownMenuGroup>
          ) : (
            <div className='px-2 py-6 text-center text-sm text-muted-foreground'>
              {t('list.noSavedViews')}
            </div>
          )}

          <DropdownMenuSeparator />

          {/* Actions */}
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Save className='h-4 w-4 mr-2' />
            {t('list.saveCurrentView')}
          </DropdownMenuItem>

          {defaultView && (
            <DropdownMenuItem onClick={handleResetToDefault}>
              <RotateCcw className='h-4 w-4 mr-2' />
              {t('list.resetToDefault')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
            <Upload className='h-4 w-4 mr-2' />
            {t('list.importViewTitle')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.saveView')}</DialogTitle>
            <DialogDescription>
              {t('list.saveViewDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='view-name'>{t('list.viewNameLabel')}</Label>
              <Input
                id='view-name'
                placeholder={t('list.viewNamePlaceholder')}
                value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSaveView()
                  }
                }}
              />
            </div>
            <div className='flex items-center space-x-2'>
              <input
                type='checkbox'
                id='set-default'
                checked={setAsDefault}
                onChange={e => setSetAsDefault(e.target.checked)}
                className='h-4 w-4'
              />
              <Label htmlFor='set-default' className='text-sm font-normal'>
                {t('list.setAsDefaultCheckbox')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setSaveDialogOpen(false)}
              data-testid='save-view-cancel'
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveView} data-testid='save-view-submit'>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename View Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.renameViewTitle')}</DialogTitle>
            <DialogDescription>
              {t('list.renameViewDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='rename-view'>{t('list.nameLabel')}</Label>
            <Input
              id='rename-view'
              placeholder={t('list.newViewNamePlaceholder')}
              value={newViewName}
              onChange={e => setNewViewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleRenameView()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setRenameDialogOpen(false)
                setViewToRename(null)
                setNewViewName('')
              }}
              data-testid='rename-view-cancel'
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRenameView} data-testid='rename-view-submit'>
              {t('list.rename')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import View Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.importViewTitle')}</DialogTitle>
            <DialogDescription>
              {t('list.importViewDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='import-json'>{t('list.importJsonLabel')}</Label>
            <textarea
              id='import-json'
              className='w-full h-40 p-2 border rounded-md font-mono text-xs'
              placeholder={t('list.importJsonPlaceholder')}
              value={importJSON}
              onChange={e => setImportJSON(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setImportDialogOpen(false)
                setImportJSON('')
              }}
              data-testid='import-view-cancel'
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleImportView} data-testid='import-view-submit'>
              {t('list.import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share View Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('list.shareViewTitle')}</DialogTitle>
            <DialogDescription>
              {t('list.shareViewDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            {viewToShare && (
              <>
                <div>
                  <Label className='text-sm font-medium'>{t('list.viewLabel')}</Label>
                  <p className='text-sm text-muted-foreground mt-1'>
                    {viewToShare.name}
                  </p>
                </div>
                <div className='space-y-2'>
                  <Label className='text-sm text-muted-foreground'>
                    {t('list.shareViewHint')}
                  </Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShareDialogOpen(false)}
              data-testid='share-view-cancel'
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCopyShareURL} data-testid='share-view-copy-link'>
              <Share2 className='h-4 w-4 mr-2' />
              {t('list.copyLink')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
