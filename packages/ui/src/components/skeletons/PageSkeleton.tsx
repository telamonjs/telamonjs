'use client'

/* eslint-disable react-refresh/only-export-components -- compound component: Object.assign(Root, { ...parts }) is the public shape */
import { cn } from '../../utils'
import { Skeleton } from '../../ui/skeleton'

// ============================================================================
// PageSkeleton — Compound component for composable page loading states
// ============================================================================

interface PageSkeletonProps {
  className?: string
  children: React.ReactNode
}

function PageSkeletonRoot({ className, children }: PageSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-4 p-4', className)}>{children}</div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  hasDescription?: boolean
  hasActions?: boolean
  className?: string
}

function Header({
  hasDescription = true,
  hasActions = true,
  className,
}: HeaderProps) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        {hasDescription && <Skeleton className="h-4 w-72" />}
      </div>
      {hasActions && (
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      )}
    </div>
  )
}

interface TabsProps {
  count?: number
  className?: string
}

function TabsSkeleton({ count = 4, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b pb-px', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-b-none" />
      ))}
    </div>
  )
}

interface StatsGridProps {
  columns?: number
  className?: string
}

function StatsGrid({ columns = 4, className }: StatsGridProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

interface ToolbarProps {
  hasSearch?: boolean
  hasFilters?: boolean
  hasActions?: boolean
  className?: string
}

function Toolbar({
  hasSearch = true,
  hasFilters = true,
  hasActions = true,
  className,
}: ToolbarProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="flex items-center gap-2">
        {hasSearch && <Skeleton className="h-9 w-64" />}
        {hasFilters && (
          <>
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </>
        )}
      </div>
      {hasActions && (
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      )}
    </div>
  )
}

interface TableProps {
  rows?: number
  columns?: number
  hasActions?: boolean
  className?: string
}

function TableSkeleton({
  rows = 8,
  columns = 5,
  hasActions = true,
  className,
}: TableProps) {
  const totalCols = hasActions ? columns + 1 : columns
  return (
    <div className={cn('rounded-md border', className)}>
      {/* Header */}
      <div className="flex items-center border-b p-3 gap-4">
        {Array.from({ length: totalCols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              'h-4',
              i === totalCols - 1 && hasActions ? 'w-16 ml-auto' : 'flex-1'
            )}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center border-b last:border-0 p-3 gap-4">
          {Array.from({ length: totalCols }).map((_, j) => (
            <Skeleton
              key={j}
              className={cn(
                'h-4',
                j === totalCols - 1 && hasActions ? 'w-16 ml-auto' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
      {/* Pagination */}
      <div className="flex items-center justify-between border-t p-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8" />
          ))}
        </div>
      </div>
    </div>
  )
}

interface DetailHeaderProps {
  hasStatus?: boolean
  hasActions?: boolean
  className?: string
}

function DetailHeader({
  hasStatus = true,
  hasActions = true,
  className,
}: DetailHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        {hasStatus && <Skeleton className="h-5 w-20 rounded-full" />}
      </div>
      {hasActions && (
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-9" />
        </div>
      )}
    </div>
  )
}

interface BreadcrumbProps {
  segments?: number
  className?: string
}

function BreadcrumbSkeleton({ segments = 3, className }: BreadcrumbProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <Skeleton className="h-4 w-2" />}
          <Skeleton className={cn('h-4', i === segments - 1 ? 'w-32' : 'w-20')} />
        </div>
      ))}
    </div>
  )
}

interface FieldGroupsProps {
  groups?: number
  fieldsPerGroup?: number
  className?: string
}

function FieldGroups({
  groups = 2,
  fieldsPerGroup = 4,
  className,
}: FieldGroupsProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g} className="rounded-lg border p-4 space-y-4">
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: fieldsPerGroup }).map((_, f) => (
              <div key={f} className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface FormProps {
  fields?: number
  hasActions?: boolean
  className?: string
}

function FormSkeleton({
  fields = 6,
  hasActions = true,
  className,
}: FormProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {hasActions && (
        <div className="flex gap-2 pt-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-20" />
        </div>
      )}
    </div>
  )
}

interface CardsProps {
  columns?: number
  count?: number
  className?: string
}

function Cards({ columns = 3, count = 6, className }: CardsProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

interface MapProps {
  hasSidebar?: boolean
  sidebarPosition?: 'left' | 'right'
  className?: string
}

function MapSkeleton({
  hasSidebar = true,
  sidebarPosition = 'left',
  className,
}: MapProps) {
  const sidebar = hasSidebar && (
    <div className="w-80 shrink-0 space-y-3 rounded-lg border p-3">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className={cn('flex gap-4 h-[calc(100vh-16rem)]', className)}>
      {sidebarPosition === 'left' && sidebar}
      <Skeleton className="flex-1 rounded-lg" />
      {sidebarPosition === 'right' && sidebar}
    </div>
  )
}

interface ContentProps {
  height?: string
  className?: string
}

function Content({ height = 'h-64', className }: ContentProps) {
  return <Skeleton className={cn('w-full', height, className)} />
}

function TabContent({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col h-full items-center justify-center gap-4', className)}>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="flex-1 w-full" />
    </div>
  )
}

interface ChartsProps {
  columns?: number
  rows?: number
  className?: string
}

function Charts({ columns = 2, rows = 2, className }: ChartsProps) {
  return (
    <div
      className={cn('grid gap-4', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: columns * rows }).map((_, i) => (
        <Skeleton key={i} className="rounded-lg min-h-[200px]" />
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Compound export
// ────────────────────────────────────────────────────────────────────────────

export const PageSkeleton = Object.assign(PageSkeletonRoot, {
  Header,
  Tabs: TabsSkeleton,
  StatsGrid,
  Toolbar,
  Table: TableSkeleton,
  DetailHeader,
  Breadcrumb: BreadcrumbSkeleton,
  FieldGroups,
  Form: FormSkeleton,
  Cards,
  Map: MapSkeleton,
  Content,
  TabContent,
  Charts,
})
