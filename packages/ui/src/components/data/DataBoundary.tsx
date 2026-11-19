'use client'

import React, { Component, Suspense, useCallback } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useTelamonjsT } from '../../i18n/use-t'

// --- Types ---
export interface DataBoundaryProps {
  children: React.ReactNode
  /** Fallback UI during Suspense loading */
  loadingFallback?: React.ReactNode
  /** Custom error UI renderer */
  renderError?: (error: Error, reset: () => void) => React.ReactNode
  /** Custom empty state UI */
  emptyFallback?: React.ReactNode
  /** Called when error boundary catches an error */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Enable Suspense wrapping (default: true) */
  suspense?: boolean
}

interface ErrorBoundaryState {
  error: Error | null
}

// --- Error Boundary Class Component ---
// `renderError` is always supplied by `DataBoundary` below (its own translated
// default, unless the caller passes one) — class components can't call hooks,
// so the i18n'd fallback UI lives in `DataBoundary`, not here.
class ErrorBoundaryInner extends Component<
  {
    children: React.ReactNode
    renderError: (error: Error, reset: () => void) => React.ReactNode
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return this.props.renderError(this.state.error, this.reset)
    }

    return this.props.children
  }
}

// --- Default Loading Fallback ---
function DefaultLoadingFallback() {
  const t = useTelamonjsT()
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
    </div>
  )
}

// --- DataBoundary Component ---
export function DataBoundary({
  children,
  loadingFallback,
  renderError,
  onError,
  suspense = true,
}: DataBoundaryProps) {
  const t = useTelamonjsT()
  const defaultRenderError = useCallback(
    (error: Error, reset: () => void) => (
      <div role="alert" className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{t('data.boundaryErrorTitle')}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {error.message || t('data.boundaryErrorMessage')}
          </p>
        </div>
        <button
          onClick={reset}
          data-testid="data-boundary-retry"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {t('common.retry')}
        </button>
      </div>
    ),
    [t]
  )

  const content = (
    <ErrorBoundaryInner renderError={renderError ?? defaultRenderError} onError={onError}>
      {children}
    </ErrorBoundaryInner>
  )

  if (suspense) {
    return (
      <Suspense fallback={loadingFallback ?? <DefaultLoadingFallback />}>
        {content}
      </Suspense>
    )
  }

  return content
}
