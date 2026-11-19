/**
 * UI Components - Integration Tests
 *
 * Cross-component scenarios composing Card/Label/Input/Textarea/Switch/
 * Checkbox/Button together (form-like structure, keyboard tab order, ARIA
 * wiring). Single-component behavior lives co-located next to each primitive
 * (src/ui/*.test.tsx); these tests validate the composition, so they stay
 * here rather than under any one component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from './test-utils'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Switch } from '../ui/switch'
import { Checkbox } from '../ui/checkbox'

describe('UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Integration', () => {
    it('combines components in a form-like structure', async () => {
      const handleSubmit = vi.fn()
      const user = userEvent.setup()

      renderWithProviders(
        <Card>
          <CardHeader>
            <CardTitle>User Form</CardTitle>
            <CardDescription>Enter user details</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label htmlFor='name'>Name</Label>
              <Input id='name' placeholder='Enter name' />
            </div>
            <div>
              <Label htmlFor='bio'>Bio</Label>
              <Textarea id='bio' placeholder='Tell us about yourself' />
            </div>
            <div className='flex items-center space-x-2'>
              <Switch id='notifications' />
              <Label htmlFor='notifications'>Enable notifications</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox id='terms' />
              <Label htmlFor='terms'>I agree to terms</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSubmit}>Submit</Button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText('User Form')).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Bio')).toBeInTheDocument()
      expect(screen.getByLabelText('Enable notifications')).toBeInTheDocument()
      expect(screen.getByLabelText('I agree to terms')).toBeInTheDocument()

      const submitButton = screen.getByRole('button', { name: 'Submit' })
      await user.click(submitButton)

      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <div>
          <Button>First</Button>
          <Button>Second</Button>
          <Input placeholder='Input field' />
        </div>
      )

      // Tab through elements
      await user.tab()
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('textbox')).toHaveFocus()
    })

    it('maintains proper ARIA attributes', () => {
      renderWithProviders(
        <div>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            aria-describedby='email-help'
            aria-required='true'
          />
          <div id='email-help'>Enter a valid email address</div>
        </div>
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'email-help')
      expect(input).toHaveAttribute('aria-required', 'true')
    })
  })
})
