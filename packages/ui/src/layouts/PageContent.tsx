import React from 'react'
import { cn } from '../utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '../ui/card'

/** Element of the page title: a heading level, or `section` (default, legacy). */
export type PageTitleElement = 'h1' | 'h2' | 'h3' | 'section'

function PageHeader({
  className,
  children,
  as: Element = 'section',
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: PageTitleElement }) {
  return (
    <Element
      className={cn('text-2xl font-bold tracking-tight', className)}
      {...props}
    >
      {children}
    </Element>
  )
}

function PageHeaderDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-muted-foreground', className)} {...props} />
}

interface PageContentProps {
  title?: string
  description?: string
  footer?: string
  variant?: 'card' | 'plain'
  /**
   * Element of the title. Default `section` (not in the heading outline, as
   * before); pass `'h2'` (or `'h1'`/`'h3'`) to make it a real heading. Mind a
   * shell that already renders the page `h1`
   */
  titleAs?: PageTitleElement
}

function PageContent({
  className,
  children,
  title,
  description,
  footer,
  variant = 'card',
  titleAs,
  ...props
}: PageContentProps & React.HTMLAttributes<HTMLDivElement>) {
  // Variant 'plain': no card wrapper (for section pages)
  if (variant === 'plain') {
    return (
      <div
        className={cn('flex w-full flex-col space-y-6 p-4 lg:p-6', className)}
        {...props}
      >
        {(title || description) && (
          <div className='space-y-1'>
            {title && <PageHeader as={titleAs}>{title}</PageHeader>}
            {description && (
              <PageHeaderDescription>{description}</PageHeaderDescription>
            )}
          </div>
        )}
        {children}
      </div>
    )
  }

  // Variant 'card' (default): with card wrapper (for forms and detail views)
  return (
    <div className='flex w-full flex-col space-y-4 p-4 lg:p-6'>
      <Card
        className={cn(
          'flex w-full flex-col border border-border bg-card shadow-sm print:border-0 print:shadow-none',
          className
        )}
      >
        {(title || description) && (
          <CardHeader className='border-b border-border/50 px-4 py-3 shadow-sm shadow-border md:px-6 md:py-4 print:px-0'>
            {title && (
              <PageHeader
                as={titleAs}
                className='text-xl font-semibold text-foreground md:p-0'
              >
                {title}
              </PageHeader>
            )}
            {description && (
              <CardDescription className='mt-1 text-muted-foreground'>
                {description}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className='w-full px-4 py-4 md:px-6 md:py-6 print:px-0'>
          {children}
        </CardContent>
        {footer && (
          <CardFooter className='border-t border-border/50 px-4 py-3 md:px-6'>
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

export { PageContent, PageHeader, PageHeaderDescription }
