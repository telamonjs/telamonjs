'use client'

import { PageContent, type PageTitleElement } from '../../layouts/PageContent'
import { ReactNode } from 'react'

export interface ReportLayoutProps {
  /** Report title */
  title: string
  /** Report description */
  description: string
  /** Filters component (e.g. DateRangePicker + Export button) */
  filters?: ReactNode
  /** Array of KPI cards */
  kpis?: ReactNode[]
  /** Main content (charts, tables, etc.) */
  children?: ReactNode
  /** Additional className */
  className?: string
  /** Title element — `'h2'` makes it a heading (default `section`, unchanged) */
  titleAs?: PageTitleElement
}

/**
 * Default layout for report pages.
 *
 * Unifies the structure shared by all reports:
 * - Filters at the top
 * - KPI grid (4 columns)
 * - Main content (charts, tables, etc.)
 *
 * @example
 * ```tsx
 * <ReportLayout
 *   title="Sales Report"
 *   description="Detailed sales analysis"
 *   filters={
 *     <ReportFiltersBar
 *       dateRange={dateRange}
 *       onDateRangeChange={setDateRange}
 *       onExport={handleExport}
 *     />
 *   }
 *   kpis={[
 *     <KPICardCurrency key="total" title="Total" value={1000} />,
 *     <KPICardNumber key="qty" title="Quantity" value={50} />
 *   ]}
 * >
 *   <ReportLineChart ... />
 *   <ReportBarChart ... />
 * </ReportLayout>
 * ```
 */
export function ReportLayout({
  title,
  description,
  filters,
  kpis,
  children,
  className,
  titleAs,
}: ReportLayoutProps) {
  return (
    <PageContent
      title={title}
      description={description}
      className={className}
      titleAs={titleAs}
    >
      {/* Filters */}
      {filters && <div className='mb-6'>{filters}</div>}

      {/* KPIs */}
      {kpis && kpis.length > 0 && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6'>
          {kpis.map((kpi, kpiIdx) => (
            <div key={`kpi-${kpiIdx}`}>{kpi}</div>
          ))}
        </div>
      )}

      {/* Main Content */}
      {children && <div className='space-y-6'>{children}</div>}
    </PageContent>
  )
}
