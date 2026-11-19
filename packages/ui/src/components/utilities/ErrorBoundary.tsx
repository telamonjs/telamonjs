'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { logger } from '../../utils/logger'
import { useTelamonjsT } from '../../i18n/use-t'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)

    logger.error('ErrorBoundary caught an error', { error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <DefaultErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  onReset?: () => void
}

export function DefaultErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const t = useTelamonjsT()
  const handleReset = () => {
    if (onReset) {
      onReset()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className='min-h-[400px] flex items-center justify-center p-8'>
      <div className='text-center max-w-md'>
        <div className='mb-4'>
          <AlertCircle className='w-16 h-16 text-red-500 mx-auto' />
        </div>

        <h1 className='text-2xl font-bold text-foreground mb-2'>
          {t('common.boundaryTitle')}
        </h1>

        <p className='text-muted-foreground mb-6'>
          {t('common.boundaryDescription')}
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className='mb-6 text-left bg-red-50 dark:bg-red-950/30 p-4 rounded-lg'>
            <summary className='cursor-pointer font-medium text-red-800 dark:text-red-300 mb-2'>
              {t('common.boundaryDevDetails')}
            </summary>
            <pre className='text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap break-words'>
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <button
          onClick={handleReset}
          className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
          data-testid='error-boundary-reset-button'
        >
          <RefreshCw className='w-4 h-4 mr-2' />
          {t('common.boundaryRetry')}
        </button>
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- HOC factory tightly coupled to this file's ErrorBoundary class, standard React pattern
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
