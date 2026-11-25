'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../utils'
import { Button } from '../ui/button'
import { type DashboardFullscreenProps } from '../types/dashboard'
import { getIcon } from '../utils/icon'
import { useTelamonjsT, useText } from '../i18n/use-t'

/**
 * Resolves and renders the header icon (string key or direct component).
 * Plain function (not a component) so react-compiler doesn't treat the
 * locally-resolved icon as a JSX element type created during render.
 */
function renderHeaderIcon(
  icon: DashboardFullscreenProps['icon'],
  className: string
) {
  if (!icon) return null
  const Icon = typeof icon === 'string' ? getIcon(icon) : icon
  return <Icon className={className} />
}

/**
 * DashboardFullscreen - Fullscreen overlay for immersive dashboard viewing
 *
 * Features:
 * - ESC key closes overlay
 * - Focus trap (prevents body scroll)
 * - Fade-in on open (CSS, tailwindcss-animate)
 * - Z-index: 50 (above modals)
 * - Full viewport coverage
 *
 * @example
 * ```tsx
 * const [isFullscreen, setIsFullscreen] = useState(false)
 *
 * <DashboardFullscreen
 *   isOpen={isFullscreen}
 *   onClose={() => setIsFullscreen(false)}
 *   title="My Assets"
 *   icon={Truck}
 *   status="online"
 *   statusLabel="42 assets online"
 * >
 *   <MapComponent />
 * </DashboardFullscreen>
 * ```
 */
export function DashboardFullscreen({
  isOpen,
  onClose,
  title,
  icon: iconProp,
  status,
  statusLabel,
  children,
}: DashboardFullscreenProps) {
  const t = useTelamonjsT()
  const text = useText()
  // ESC key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Focus trap (prevent body scroll)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 bg-background animate-in fade-in-0'>
          {/* Header */}
          <div className='flex items-center justify-between border-b px-4 py-3'>
            <div className='flex items-center gap-3'>
              {iconProp && (
                <div className='p-2 rounded-lg bg-primary/10'>
                  {renderHeaderIcon(iconProp, 'h-5 w-5 text-primary')}
                </div>
              )}
              <div>
                <h1 className='text-lg font-semibold'>{text(title)}</h1>
                {status && statusLabel && (
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        status === 'online' && 'bg-green-500 animate-pulse',
                        status === 'offline' && 'bg-red-500',
                        status === 'loading' && 'bg-blue-500 animate-pulse',
                        status === 'error' && 'bg-red-500'
                      )}
                    />
                    {text(statusLabel)}
                  </div>
                )}
              </div>
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={onClose}
              className='h-8 w-8 p-0'
              aria-label={t('dashboard.closeFullscreen')}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Content */}
          <div className='h-[calc(100vh-57px)] overflow-auto'>{children}</div>
    </div>
  )
}
