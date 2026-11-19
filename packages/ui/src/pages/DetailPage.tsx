'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Skeleton } from '../ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  ArrowLeft,
  Copy,
  Check,
  Eye,
  EyeOff,
  Calendar,
  User,
  Clock,
  Activity,
  Settings,
  Info,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '../utils'
import { withComponent } from '../utils/logger'
import { TEST_IDS } from '../utils/test-ids'
import { useTelamonjsT, useText } from '../i18n/use-t'
import { useFormat } from '../i18n/use-format'
import type { I18nText } from '../i18n/msg'

const logger = withComponent('DetailPage')

interface FieldGroup {
  title: I18nText
  icon?: React.ReactNode
  description?: I18nText
  fields: DetailField[]
}

interface DetailField {
  label: I18nText
  value: unknown
  type?:
    | 'text'
    | 'badge'
    | 'date'
    | 'boolean'
    | 'email'
    | 'phone'
    | 'url'
    | 'code'
    | 'status'
  icon?: React.ReactNode
  copyable?: boolean
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  href?: string
  format?: (value: unknown) => string
  visible?: boolean
}

interface ActionButton {
  label: I18nText
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'
  disabled?: boolean
  loading?: boolean
}

interface DetailPageProps {
  title: I18nText
  subtitle?: I18nText
  status?: {
    label: I18nText
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  fieldGroups: FieldGroup[]
  actions?: ActionButton[]
  tabs?: Array<{
    id: string
    label: I18nText
    icon?: React.ReactNode
    content: React.ReactNode
  }>
  breadcrumb?: Array<{
    label: I18nText
    href?: string
  }>
  metadata?: {
    createdAt?: Date
    updatedAt?: Date
    createdBy?: string
    updatedBy?: string
  }
  loading?: boolean
  error?: string
  onBack?: () => void
  className?: string
}

export function DetailPage({
  title,
  subtitle,
  status,
  fieldGroups,
  actions = [],
  tabs,
  breadcrumb,
  metadata,
  loading = false,
  error,
  onBack,
  className,
}: DetailPageProps) {
  const router = useRouter()
  const t = useTelamonjsT()
  const text = useText()
  const format = useFormat()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showSensitive, setShowSensitive] = useState(false)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  const copyToClipboard = async (value: string, fieldLabel: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(fieldLabel)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      logger.error('Failed to copy text to clipboard', {
        error: err instanceof Error ? err.message : String(err),
        fieldLabel,
      })
    }
  }

  const formatFieldValue = (field: DetailField) => {
    if (
      field.value === null ||
      field.value === undefined ||
      field.value === ''
    ) {
      return '—'
    }

    if (field.format) {
      return field.format(field.value)
    }

    switch (field.type) {
      case 'date':
        return format.date(field.value as string | number | Date)
      case 'boolean':
        return field.value ? t('common.yes') : t('common.no')
      case 'phone':
        return String(field.value).replace(
          /(\d{2})(\d{5})(\d{4})/,
          '($1) $2-$3'
        )
      case 'code':
        return showSensitive ? String(field.value) : '••••••••'
      default:
        return String(field.value)
    }
  }

  const renderField = (field: DetailField) => {
    if (field.visible === false) return null

    const formattedValue = formatFieldValue(field)
    const isEmpty = formattedValue === '—'
    const label = text(field.label) ?? ''

    return (
      <div
        key={label}
        className='space-y-2 animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none'
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            {field.icon && (
              <div className='text-muted-foreground'>{field.icon}</div>
            )}
            <label className='text-sm font-medium text-muted-foreground'>
              {label}
            </label>
          </div>

          {field.copyable && !isEmpty && (
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
              onClick={() => copyToClipboard(String(field.value), label)}
              title={
                copiedField === label ? t('common.copied') : t('common.copy')
              }
              aria-label={
                copiedField === label ? t('common.copied') : t('common.copy')
              }
            >
              {copiedField === label ? (
                <Check className='h-3 w-3 text-green-600' />
              ) : (
                <Copy className='h-3 w-3' />
              )}
            </Button>
          )}

          {field.type === 'code' && (
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0'
              onClick={() => setShowSensitive(!showSensitive)}
              aria-label={
                showSensitive ? t('detail.hideValue') : t('detail.showValue')
              }
            >
              {showSensitive ? (
                <EyeOff className='h-3 w-3' />
              ) : (
                <Eye className='h-3 w-3' />
              )}
            </Button>
          )}
        </div>

        <div className='min-h-[1.5rem]'>
          {field.type === 'badge' ? (
            <Badge variant={field.variant || 'default'} className='text-xs'>
              {formattedValue}
            </Badge>
          ) : field.href ? (
            <a
              href={field.href}
              className='text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors'
              target='_blank'
              rel='noopener noreferrer'
            >
              {formattedValue}
            </a>
          ) : (
            <div
              className={cn(
                'text-sm',
                isEmpty
                  ? 'text-muted-foreground italic'
                  : 'text-foreground font-medium',
                field.type === 'code' && 'font-mono'
              )}
            >
              {formattedValue}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className='min-h-[400px] p-4 space-y-6'>
        <div className='flex items-start justify-between'>
          <div className='space-y-2'>
            <Skeleton className='h-9 w-64' />
            <Skeleton className='h-5 w-20 rounded-full' />
          </div>
          <div className='flex gap-2'>
            <Skeleton className='h-9 w-28' />
            <Skeleton className='h-9 w-9' />
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, g) => (
          <div key={g} className='rounded-lg border p-4 space-y-4'>
            <Skeleton className='h-5 w-36' />
            <div className='grid grid-cols-2 gap-4'>
              {Array.from({ length: 4 }).map((_, f) => (
                <div key={f} className='space-y-1.5'>
                  <Skeleton className='h-3.5 w-24' />
                  <Skeleton className='h-5 w-full' />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center space-y-4'>
          <div className='text-destructive'>
            <Info className='h-8 w-8 mx-auto' />
          </div>
          <div>
            <h3 className='font-semibold'>{t('detail.loadError')}</h3>
            <p className='text-sm text-muted-foreground'>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)} data-testid='detail-page'>
      {/* Header */}
      <div className='space-y-4'>
        {/* Breadcrumb */}
        {breadcrumb && (
          <nav className='flex items-center space-x-2 text-sm text-muted-foreground'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleBack}
              className='h-8 px-2'
              data-testid='detail-page-back-button'
            >
              <ArrowLeft className='h-4 w-4 mr-1' />
              {t('common.back')}
            </Button>
            <Separator orientation='vertical' className='h-4' />
            {breadcrumb.map((item, itemIdx) => {
              const itemLabel = text(item.label) ?? ''
              return (
                <React.Fragment key={itemLabel}>
                  {item.href ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => router.push(item.href!)}
                      className='h-8 px-2'
                      data-testid={TEST_IDS.DETAIL.action(
                        `breadcrumb-${itemLabel}`
                      )}
                    >
                      {itemLabel}
                    </Button>
                  ) : (
                    <span className='text-foreground font-medium'>
                      {itemLabel}
                    </span>
                  )}
                  {itemIdx < breadcrumb.length - 1 && <span>/</span>}
                </React.Fragment>
              )
            })}
          </nav>
        )}

        {/* Title and Actions */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-2'>
            <div className='flex items-center space-x-3'>
              <h1 className='text-2xl font-bold tracking-tight'>
                {text(title)}
              </h1>
              {status && (
                <Badge variant={status.variant} className='text-xs'>
                  {text(status.label)}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className='text-muted-foreground'>{text(subtitle)}</p>
            )}
          </div>

          {actions.length > 0 && (
            <div className='flex items-center space-x-2'>
              {actions.map(action => {
                const actionLabel = text(action.label) ?? ''
                return (
                  <Button
                    key={actionLabel}
                    variant={action.variant || 'default'}
                    size='sm'
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    className='whitespace-nowrap'
                    data-testid={TEST_IDS.DETAIL.action(actionLabel)}
                  >
                    {action.loading ? (
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2' />
                    ) : (
                      <span className='mr-2'>{action.icon}</span>
                    )}
                    {actionLabel}
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {tabs ? (
        <Tabs defaultValue={tabs[0]?.id} className='space-y-6'>
          <TabsList
            className='grid w-full'
            style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
          >
            {tabs.map(tab => {
              const tabLabel = text(tab.label) ?? ''
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className='flex items-center space-x-2'
                  data-testid={TEST_IDS.DETAIL.TAB(tabLabel)}
                >
                  {tab.icon}
                  <span>{tabLabel}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className='space-y-6'>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {fieldGroups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className='animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-backwards motion-reduce:animate-none'
              style={{ animationDelay: `${groupIndex * 100}ms` }}
            >
              <Card className='group h-full'>
                <CardHeader className='pb-3'>
                  <CardTitle className='flex items-center space-x-2 text-base'>
                    {group.icon && (
                      <div className='text-primary'>{group.icon}</div>
                    )}
                    <span>{text(group.title)}</span>
                  </CardTitle>
                  {group.description && (
                    <p className='text-sm text-muted-foreground'>
                      {text(group.description)}
                    </p>
                  )}
                </CardHeader>
                <CardContent className='space-y-4'>
                  {group.fields.map(field => renderField(field))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2 text-base'>
              <Activity className='h-4 w-4 text-primary' />
              <span>{t('detail.systemInfo')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {metadata.createdAt && (
                <div className='space-y-1'>
                  <div className='flex items-center space-x-2'>
                    <Calendar className='h-3 w-3 text-muted-foreground' />
                    <label className='text-xs font-medium text-muted-foreground'>
                      {t('detail.createdAt')}
                    </label>
                  </div>
                  <p className='text-sm font-medium'>
                    {format.date(metadata.createdAt)}
                  </p>
                </div>
              )}

              {metadata.updatedAt && (
                <div className='space-y-1'>
                  <div className='flex items-center space-x-2'>
                    <Clock className='h-3 w-3 text-muted-foreground' />
                    <label className='text-xs font-medium text-muted-foreground'>
                      {t('detail.updatedAt')}
                    </label>
                  </div>
                  <p className='text-sm font-medium'>
                    {format.date(metadata.updatedAt)}
                  </p>
                </div>
              )}

              {metadata.createdBy && (
                <div className='space-y-1'>
                  <div className='flex items-center space-x-2'>
                    <User className='h-3 w-3 text-muted-foreground' />
                    <label className='text-xs font-medium text-muted-foreground'>
                      {t('detail.createdBy')}
                    </label>
                  </div>
                  <p className='text-sm font-medium'>{metadata.createdBy}</p>
                </div>
              )}

              {metadata.updatedBy && (
                <div className='space-y-1'>
                  <div className='flex items-center space-x-2'>
                    <Settings className='h-3 w-3 text-muted-foreground' />
                    <label className='text-xs font-medium text-muted-foreground'>
                      {t('detail.updatedBy')}
                    </label>
                  </div>
                  <p className='text-sm font-medium'>{metadata.updatedBy}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
