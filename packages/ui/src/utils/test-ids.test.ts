import { describe, expect, it } from 'vitest'
import {
  TEST_IDS,
  getTestId,
  getAriaLabel,
  getFieldAccessibilityAttrs,
  getActionAccessibilityAttrs,
} from './test-ids'

describe('Test ID Helpers', () => {
  it('generates test ID with all parts', () => {
    const testId = getTestId({
      entity: 'user',
      action: 'edit',
      target: 'button',
    })
    expect(testId).toBe('user-edit-button')
  })

  it('generates test ID with partial parts', () => {
    const testId = getTestId({
      action: 'submit',
      target: 'button',
    })
    expect(testId).toBe('submit-button')
  })

  it('generates test ID for row action', () => {
    const testId = TEST_IDS.ROW_ACTION.edit(123)
    expect(testId).toBe('row-action-edit-123')
  })

  it('generates test ID for field', () => {
    const testId = TEST_IDS.FORM.field('email')
    expect(testId).toBe('field-email')
  })

  it('generates test ID for pagination', () => {
    expect(TEST_IDS.PAGINATION.FIRST).toBe('pagination-first')
    expect(TEST_IDS.PAGINATION.PAGE(3)).toBe('pagination-page-3')
  })

  it('generates test ID for toolbar', () => {
    expect(TEST_IDS.TOOLBAR.ADD).toBe('toolbar-add')
    expect(TEST_IDS.TOOLBAR.REFRESH).toBe('toolbar-refresh')
  })
})

describe('Aria Label Helpers', () => {
  it('generates aria-label for action', () => {
    const label = getAriaLabel('Edit', 'user', 'John Doe')
    expect(label).toBe('Edit user John Doe')
  })

  it('generates aria-label without identifier', () => {
    const label = getAriaLabel('Delete', 'asset')
    expect(label).toBe('Delete asset')
  })
})

describe('Field Accessibility Attributes', () => {
  it('generates attributes for required field', () => {
    const attrs = getFieldAccessibilityAttrs({
      name: 'email',
      label: 'Email Address',
      required: true,
    })

    expect(attrs).toMatchObject({
      'data-testid': 'field-email',
      'aria-label': 'Email Address',
      'aria-required': true,
      id: 'field-email',
    })
  })

  it('generates attributes for field with error', () => {
    const attrs = getFieldAccessibilityAttrs({
      name: 'email',
      label: 'Email Address',
      error: 'Invalid email',
    })

    expect(attrs).toMatchObject({
      'data-testid': 'field-email',
      'aria-label': 'Email Address',
      'aria-invalid': true,
      'aria-describedby': 'field-email-error',
    })
  })

  it('generates attributes for field with description', () => {
    const attrs = getFieldAccessibilityAttrs({
      name: 'password',
      label: 'Password',
      description: 'Must be at least 8 characters',
    })

    expect(attrs['aria-describedby']).toBe('field-password-description')
  })

  it('generates attributes for field with error and description', () => {
    const attrs = getFieldAccessibilityAttrs({
      name: 'email',
      label: 'Email',
      error: 'Required',
      description: 'Enter your work email',
    })

    expect(attrs['aria-describedby']).toBe(
      'field-email-error field-email-description'
    )
  })
})

describe('Action Accessibility Attributes', () => {
  it('generates attributes for row action', () => {
    const attrs = getActionAccessibilityAttrs({
      id: 'edit',
      label: 'Edit',
      entityName: 'user',
      entityId: 123,
      entityLabel: 'John Doe',
    })

    expect(attrs).toMatchObject({
      'data-testid': 'row-action-edit-123',
      'aria-label': 'Edit user John Doe',
    })
  })

  it('generates attributes for loading action', () => {
    const attrs = getActionAccessibilityAttrs({
      id: 'delete',
      label: 'Delete',
      entityName: 'asset',
      entityId: 456,
      loading: true,
    })

    expect(attrs).toMatchObject({
      'data-testid': 'row-action-delete-456',
      'data-loading': true,
      'aria-busy': true,
    })
  })

  it('generates attributes for simple action', () => {
    const attrs = getActionAccessibilityAttrs({
      id: 'submit',
      label: 'Submit',
    })

    expect(attrs).toMatchObject({
      'data-testid': 'submit-button',
      'aria-label': 'Submit',
    })
  })
})

describe('TEST_IDS Constants', () => {
  it('has correct form test IDs', () => {
    expect(TEST_IDS.FORM.SUBMIT).toBe('form-submit-button')
    expect(TEST_IDS.FORM.CANCEL).toBe('form-cancel-button')
    expect(TEST_IDS.FORM.field('username')).toBe('field-username')
    expect(TEST_IDS.FORM.error('email')).toBe('field-email-error')
  })

  it('has correct table test IDs', () => {
    expect(TEST_IDS.TABLE.ROOT).toBe('data-table')
    expect(TEST_IDS.TABLE.ROW('123')).toBe('row-123')
    expect(TEST_IDS.TABLE.CELL('123', 'name')).toBe('cell-123-name')
  })

  it('has correct row action test IDs', () => {
    expect(TEST_IDS.ROW_ACTION.view(1)).toBe('row-action-view-1')
    expect(TEST_IDS.ROW_ACTION.edit(2)).toBe('row-action-edit-2')
    expect(TEST_IDS.ROW_ACTION.delete(3)).toBe('row-action-delete-3')
    expect(TEST_IDS.ROW_ACTION.custom('approve', 4)).toBe(
      'row-action-approve-4'
    )
  })

  it('has correct toolbar test IDs', () => {
    expect(TEST_IDS.TOOLBAR.ADD).toBe('toolbar-add')
    expect(TEST_IDS.TOOLBAR.REFRESH).toBe('toolbar-refresh')
    expect(TEST_IDS.TOOLBAR.EXPORT).toBe('toolbar-export')
    expect(TEST_IDS.TOOLBAR.FILTERS).toBe('toolbar-filters')
    expect(TEST_IDS.TOOLBAR.COLUMNS).toBe('toolbar-columns')
  })

  it('has correct pagination test IDs', () => {
    expect(TEST_IDS.PAGINATION.FIRST).toBe('pagination-first')
    expect(TEST_IDS.PAGINATION.PREVIOUS).toBe('pagination-previous')
    expect(TEST_IDS.PAGINATION.NEXT).toBe('pagination-next')
    expect(TEST_IDS.PAGINATION.LAST).toBe('pagination-last')
    expect(TEST_IDS.PAGINATION.PAGE(5)).toBe('pagination-page-5')
    expect(TEST_IDS.PAGINATION.PAGE_SIZE).toBe('pagination-page-size')
  })

  it('has correct detail test IDs', () => {
    expect(TEST_IDS.DETAIL.field('email')).toBe('detail-field-email')
    expect(TEST_IDS.DETAIL.action('Edit')).toBe('detail-action-edit')
    expect(TEST_IDS.DETAIL.TAB('General')).toBe('detail-tab-general')
  })

  it('has correct modal test IDs', () => {
    expect(TEST_IDS.MODAL.ROOT).toBe('modal')
    expect(TEST_IDS.MODAL.CLOSE).toBe('modal-close')
    expect(TEST_IDS.MODAL.CONFIRM).toBe('modal-confirm')
    expect(TEST_IDS.MODAL.CANCEL).toBe('modal-cancel')
  })
})
