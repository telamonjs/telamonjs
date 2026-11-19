/**
 * Detail Components - Integration Tests
 *
 * Cross-component scenarios exercising DetailLayout together with DetailCard,
 * DetailStatus, DetailAvatar, DetailStatsGrid and
 * DetailActions in the same tree. Single-component behavior lives co-located
 * next to each component (src/components/detail/Detail*.test.tsx); these
 * tests validate the composition, so they stay here rather than under any
 * one component.
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './test-utils'
import { DetailLayout } from '../components/detail/DetailLayout'
import { DetailCard } from '../components/detail/DetailCard'
import { DetailStatsGrid } from '../components/detail/DetailStatsGrid'
import { DetailStatus } from '../components/detail/DetailStatus'
import { DetailAvatar } from '../components/detail/DetailAvatar'
import { DetailActions } from '../components/detail/DetailActions'

describe('Detail Components - Enhanced Coverage', () => {
  describe('Integration Tests', () => {
    it('renders complete detail page with all components', () => {
      const { User, Mail, Phone, DollarSign } = require('lucide-react')

      renderWithProviders(
        <DetailLayout
          title='User Profile'
          description='John Doe'
          headerActions={<button>Edit Profile</button>}
          alerts={[
            {
              variant: 'warning',
              title: 'Verify Email',
              message: 'Please verify your email address',
            },
          ]}
          leftColumn={
            <>
              <DetailCard
                title='Personal Information'
                icon={User}
                fields={[
                  { label: 'Name', value: 'John Doe', icon: User },
                  { label: 'Email', value: 'john@example.com', icon: Mail },
                  { label: 'Phone', value: '+1234567890', icon: Phone },
                ]}
              />
              <DetailCard title='Account Status'>
                <DetailStatus
                  status='ACTIVE'
                  statusConfig={{
                    ACTIVE: { label: 'Active', variant: 'default' },
                  }}
                />
              </DetailCard>
            </>
          }
          rightColumn={
            <>
              <DetailAvatar
                name='John Doe'
                subtitle='john@example.com'
                imageUrl='https://example.com/avatar.jpg'
                zoomable={false}
              />
              <DetailStatsGrid
                columns={2}
                stats={[
                  { label: 'Orders', value: 25, icon: DollarSign },
                  { label: 'Total Spent', value: 'R$ 5.000', color: 'success' },
                ]}
              />
              <DetailActions
                actions={[
                  { label: 'Send Message', onClick: vi.fn() },
                  {
                    label: 'Block User',
                    onClick: vi.fn(),
                    variant: 'destructive',
                  },
                ]}
              />
            </>
          }
        />
      )

      // Verify all major elements are rendered
      expect(screen.getByText('User Profile')).toBeInTheDocument()
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
      expect(screen.getByText('Verify Email')).toBeInTheDocument()
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
      expect(screen.getAllByText('john@example.com').length).toBeGreaterThan(0)
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Edit Profile' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Send Message' })
      ).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders large detail layout efficiently', () => {
      const startTime = performance.now()

      const largeFieldSet = Array.from({ length: 50 }, (_, i) => ({
        label: `Field ${i + 1}`,
        value: `Value ${i + 1}`,
      }))

      renderWithProviders(
        <DetailLayout
          title='Large Layout'
          leftColumn={
            <>
              <DetailCard
                title='Section 1'
                fields={largeFieldSet.slice(0, 25)}
              />
              <DetailCard
                title='Section 2'
                fields={largeFieldSet.slice(25, 50)}
              />
            </>
          }
          rightColumn={
            <DetailStatsGrid
              columns={2}
              stats={Array.from({ length: 10 }, (_, i) => ({
                label: `Stat ${i + 1}`,
                value: (i + 1) * 100,
              }))}
            />
          }
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (< 300ms)
      expect(renderTime).toBeLessThan(300)
      expect(screen.getByText('Large Layout')).toBeInTheDocument()
    })
  })
})
