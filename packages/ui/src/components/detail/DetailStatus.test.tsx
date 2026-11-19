import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import { DetailStatus } from './DetailStatus'

// Lucide icons and Next Image are mocked globally in setup.ts

describe('DetailStatus', () => {
  const statusConfig = {
    ACTIVE: {
      label: 'Active',
      variant: 'default' as const,
    },
    INACTIVE: {
      label: 'Inactive',
      variant: 'secondary' as const,
    },
    PENDING: {
      label: 'Pending',
      variant: 'outline' as const,
    },
  }

  describe('Rendering', () => {
    it('renders status with config', () => {
      renderWithProviders(
        <DetailStatus status='ACTIVE' statusConfig={statusConfig} />
      )

      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('renders with icon', () => {
      const { CheckCircle } = require('lucide-react')
      const configWithIcon = {
        ACTIVE: {
          label: 'Active',
          variant: 'default' as const,
          icon: CheckCircle,
        },
      }

      const { container } = renderWithProviders(
        <DetailStatus status='ACTIVE' statusConfig={configWithIcon} />
      )

      expect(screen.getByText('Active')).toBeInTheDocument()
      // Icon renders as SVG
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('uses fallback for unknown status', () => {
      renderWithProviders(
        <DetailStatus
          status='UNKNOWN'
          statusConfig={statusConfig}
          fallback={{ label: 'Unknown Status', variant: 'outline' }}
        />
      )

      expect(screen.getByText('Unknown Status')).toBeInTheDocument()
    })

    it('renders status value when no config match and no fallback', () => {
      renderWithProviders(
        <DetailStatus status='CUSTOM' statusConfig={statusConfig} />
      )

      expect(screen.getByText('CUSTOM')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty statusConfig', () => {
      expect(() => {
        renderWithProviders(
          <DetailStatus
            status='TEST'
            statusConfig={{}}
            fallback={{ label: 'Default', variant: 'outline' }}
          />
        )
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('renders as badge element', () => {
      renderWithProviders(
        <DetailStatus status='ACTIVE' statusConfig={statusConfig} />
      )

      const badge = screen.getByText('Active')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Enhanced Coverage', () => {
    const extendedConfig = {
      ACTIVE: { label: 'Active', variant: 'default' as const },
      INACTIVE: { label: 'Inactive', variant: 'secondary' as const },
      PENDING: { label: 'Pending', variant: 'outline' as const },
      COMPLETED: { label: 'Completed', variant: 'default' as const },
      CANCELLED: { label: 'Cancelled', variant: 'destructive' as const },
    }

    describe('Multiple Status Configs', () => {
      it('renders all config statuses correctly', () => {
        const { rerender } = renderWithProviders(
          <DetailStatus status='ACTIVE' statusConfig={extendedConfig} />
        )
        expect(screen.getByText('Active')).toBeInTheDocument()

        rerender(
          <DetailStatus status='COMPLETED' statusConfig={extendedConfig} />
        )
        expect(screen.getByText('Completed')).toBeInTheDocument()

        rerender(
          <DetailStatus status='CANCELLED' statusConfig={extendedConfig} />
        )
        expect(screen.getByText('Cancelled')).toBeInTheDocument()
      })

      it('renders icon with each variant', () => {
        const { CheckCircle, XCircle, Clock } = require('lucide-react')
        const configWithIcons = {
          ACTIVE: {
            label: 'Active',
            variant: 'default' as const,
            icon: CheckCircle,
          },
          INACTIVE: {
            label: 'Inactive',
            variant: 'secondary' as const,
            icon: XCircle,
          },
          PENDING: {
            label: 'Pending',
            variant: 'outline' as const,
            icon: Clock,
          },
        }

        const { container, rerender } = renderWithProviders(
          <DetailStatus status='ACTIVE' statusConfig={configWithIcons} />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()

        rerender(
          <DetailStatus status='PENDING' statusConfig={configWithIcons} />
        )
        expect(container.querySelector('svg')).toBeInTheDocument()
      })
    })

    describe('Fallback Behavior', () => {
      it('uses fallback for completely unknown status', () => {
        renderWithProviders(
          <DetailStatus
            status='VERY_UNKNOWN'
            statusConfig={{}}
            fallback={{ label: 'Default Status', variant: 'outline' }}
          />
        )

        expect(screen.getByText('Default Status')).toBeInTheDocument()
      })

      it('renders raw status when no config and no fallback', () => {
        renderWithProviders(
          <DetailStatus status='RAW_STATUS' statusConfig={{}} />
        )

        expect(screen.getByText('RAW_STATUS')).toBeInTheDocument()
      })
    })
  })
})
