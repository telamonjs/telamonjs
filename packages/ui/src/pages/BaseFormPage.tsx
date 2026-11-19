'use client'

import { ReactNode } from 'react'
import { PageContent } from '../layouts/PageContent'
import { useText } from '../i18n/use-t'
import type { I18nText } from '../i18n/msg'

/**
 * Props for BaseFormPage component
 */
export interface BaseFormPageProps {
  /**
   * Form component to render (CreateForm, EditForm, or custom form)
   */
  formComponent: ReactNode

  /**
   * Page title (optional)
   * If not provided, renders formComponent directly without wrapper
   */
  title?: I18nText

  /**
   * Page description (optional)
   * Only used when title is provided
   */
  description?: I18nText

  /**
   * PageContent variant
   * - 'card': Wrapped in card with border/shadow (default for create pages)
   * - 'plain': No card wrapper (default for edit pages)
   */
  variant?: 'card' | 'plain'
}

/**
 * BaseFormPage - Shared base component for CreatePage and EditPage
 *
 * Eliminates code duplication by providing a single, reusable wrapper
 * for form pages. Handles conditional PageContent wrapping logic.
 *
 * This component implements the DRY principle by extracting the shared
 * layout logic that was previously duplicated in CreatePage and EditPage.
 *
 * @example Basic usage (no wrapper)
 * ```tsx
 * <BaseFormPage formComponent={<CreateForm {...formProps} />} />
 * ```
 *
 * @example With title (wrapped in PageContent)
 * ```tsx
 * <BaseFormPage
 *   formComponent={<CreateForm {...formProps} />}
 *   title="Create New Record"
 *   description="Fill in the form below"
 *   variant="card"
 * />
 * ```
 *
 */
export function BaseFormPage({
  formComponent,
  title,
  description,
  variant = 'card',
}: BaseFormPageProps) {
  const text = useText()
  // If no title provided, render form directly (backward compatibility)
  if (!title) {
    return <>{formComponent}</>
  }

  // Wrap with PageContent for consistent layout
  return (
    <PageContent title={text(title) ?? ''} description={text(description)} variant={variant}>
      {formComponent}
    </PageContent>
  )
}
