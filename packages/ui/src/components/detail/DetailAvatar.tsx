'use client'

import Image from 'next/image'
import { Dialog, DialogContent, DialogTrigger } from '../../ui/dialog'
import { useState } from 'react'
import { cn } from '../../utils'
import { useTelamonjsT } from '../../i18n/use-t'

export interface DetailAvatarProps {
  /** Person's name */
  name: string
  /** Secondary text (e.g., enrollment number, email) */
  subtitle?: string
  /** Photo URL */
  imageUrl?: string
  /** Avatar size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Fallback gradient color */
  fallbackColor?: string
  /** Whether to allow zooming the image */
  zoomable?: boolean
  /** Additional classes */
  className?: string
}

const sizeMap = {
  sm: { container: 'h-16 w-16', text: 'text-xl', zoom: 'max-w-sm' },
  md: { container: 'h-20 w-20', text: 'text-2xl', zoom: 'max-w-md' },
  lg: { container: 'h-24 w-24', text: 'text-3xl', zoom: 'max-w-lg' },
  xl: { container: 'h-32 w-32', text: 'text-4xl', zoom: 'max-w-2xl' },
}

/**
 * Component for displaying an avatar with a photo or an initial fallback.
 *
 * Supports zooming the image via Dialog when zoomable=true.
 * If there is no image, shows the name's initial in a gradient circle.
 *
 * Ideal for detail pages of users, customers, people, etc.
 *
 * @example
 * ```tsx
 * // With photo and zoom
 * <DetailAvatar
 *   name="John Smith"
 *   subtitle="Enrollment: 123456"
 *   imageUrl="/avatar.jpg"
 *   size="lg"
 *   zoomable
 * />
 *
 * // Without photo (initial fallback)
 * <DetailAvatar
 *   name="Maria Santos"
 *   subtitle="maria@email.com"
 *   size="md"
 *   fallbackColor="from-purple-500 to-pink-600"
 * />
 *
 * // Small size without zoom
 * <DetailAvatar
 *   name="Pedro Costa"
 *   size="sm"
 *   zoomable={false}
 * />
 * ```
 */
export function DetailAvatar({
  name,
  subtitle,
  imageUrl,
  size = 'lg',
  fallbackColor = 'from-blue-500 to-indigo-600',
  zoomable = true,
  className,
}: DetailAvatarProps) {
  const t = useTelamonjsT()
  const [imageError, setImageError] = useState(false)
  const sizes = sizeMap[size]
  const initial = name.charAt(0).toUpperCase()

  // Avatar with image
  const avatarImage =
    imageUrl && !imageError ? (
      <Image
        src={imageUrl}
        alt={name}
        width={
          size === 'xl' ? 128 : size === 'lg' ? 96 : size === 'md' ? 80 : 64
        }
        height={
          size === 'xl' ? 128 : size === 'lg' ? 96 : size === 'md' ? 80 : 64
        }
        className={cn(
          sizes.container,
          'rounded-full object-cover border-2 border-slate-200',
          zoomable && 'transition-opacity group-hover:opacity-80 cursor-pointer'
        )}
        onError={() => setImageError(true)}
      />
    ) : (
      // Fallback with initial
      <div
        className={cn(
          sizes.container,
          `rounded-full bg-gradient-to-br ${fallbackColor} flex items-center justify-center text-white font-bold`,
          sizes.text
        )}
      >
        {initial}
      </div>
    )

  return (
    <div className={cn('flex items-center space-x-4', className)}>
      {imageUrl && !imageError && zoomable ? (
        <Dialog>
          <DialogTrigger asChild>
            <button className='relative group' aria-label={t('detail.zoomPhoto')}>
              {avatarImage}
              <div className='absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 rounded-full transition-colors'>
                <span className='text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity'>
                  {t('detail.zoom')}
                </span>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className={sizes.zoom}>
            <div className='flex flex-col items-center gap-4'>
              <h3 className='text-xl font-semibold'>{name}</h3>
              <Image
                src={imageUrl}
                alt={name}
                width={448}
                height={448}
                className='w-full rounded-lg object-contain'
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        avatarImage
      )}

      <div>
        <h3
          className={cn('font-semibold', size === 'xl' ? 'text-xl' : 'text-lg')}
        >
          {name}
        </h3>
        {subtitle && (
          <p className='text-sm text-muted-foreground'>{subtitle}</p>
        )}
      </div>
    </div>
  )
}
