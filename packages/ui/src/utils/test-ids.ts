/**
 * Test Helpers and Accessibility Utilities
 *
 * Provides utilities for generating consistent test IDs and accessibility attributes
 * across the telamonjs UI framework.
 *
 * @see apps/docs/content/docs/patterns/accessibility.mdx (repo interno)
 */

/**
 * Test ID naming pattern: {entity}-{action}-{target}
 *
 * Examples:
 * - "user-edit-button" - Button to edit a user
 * - "field-email" - Email input field
 * - "form-submit-button" - Form submit button
 * - "row-action-view-123" - View action for row with ID 123
 * - "toolbar-refresh" - Toolbar refresh button
 */

export interface TestIdOptions {
  /**
   * Entity name (e.g., "user", "asset", "client")
   */
  entity?: string

  /**
   * Action being performed (e.g., "edit", "delete", "view", "submit")
   */
  action?: string

  /**
   * Target identifier (e.g., "button", "field", row ID)
   */
  target?: string

  /**
   * Optional suffix for uniqueness
   */
  suffix?: string
}

/**
 * Generates a consistent test ID following the telamonjs naming pattern
 *
 * @param options - Test ID configuration
 * @returns A kebab-cased test ID string
 *
 * @example
 * ```typescript
 * getTestId({ entity: 'user', action: 'edit', target: 'button' })
 * // Returns: "user-edit-button"
 *
 * getTestId({ action: 'submit', target: 'button' })
 * // Returns: "submit-button"
 *
 * getTestId({ entity: 'field', target: 'email' })
 * // Returns: "field-email"
 *
 * getTestId({ entity: 'row-action', action: 'view', target: '123' })
 * // Returns: "row-action-view-123"
 * ```
 */
export function getTestId(options: TestIdOptions): string {
  const parts = [
    options.entity,
    options.action,
    options.target,
    options.suffix,
  ].filter(Boolean)

  return parts.join('-').toLowerCase().replace(/\s+/g, '-')
}

/**
 * Common test ID patterns used throughout telamonjs
 */
export const TEST_IDS = {
  // Form patterns
  FORM: {
    SUBMIT: 'form-submit-button',
    CANCEL: 'form-cancel-button',
    RESET: 'form-reset-button',
    field: (name: string) => getTestId({ entity: 'field', target: name }),
    error: (name: string) =>
      getTestId({ entity: 'field', target: name, suffix: 'error' }),
    description: (name: string) =>
      getTestId({ entity: 'field', target: name, suffix: 'description' }),
  },

  // DataTable patterns
  TABLE: {
    ROOT: 'data-table',
    ROW: (id: string | number) =>
      getTestId({ entity: 'row', target: String(id) }),
    CELL: (rowId: string | number, columnId: string) =>
      getTestId({ entity: 'cell', target: `${rowId}-${columnId}` }),
  },

  // Row actions
  ROW_ACTION: {
    view: (id: string | number) =>
      getTestId({ entity: 'row-action', action: 'view', target: String(id) }),
    edit: (id: string | number) =>
      getTestId({ entity: 'row-action', action: 'edit', target: String(id) }),
    delete: (id: string | number) =>
      getTestId({ entity: 'row-action', action: 'delete', target: String(id) }),
    custom: (actionId: string, rowId: string | number) =>
      getTestId({
        entity: 'row-action',
        action: actionId,
        target: String(rowId),
      }),
  },

  // Toolbar patterns
  TOOLBAR: {
    ADD: 'toolbar-add',
    REFRESH: 'toolbar-refresh',
    EXPORT: 'toolbar-export',
    FILTERS: 'toolbar-filters',
    COLUMNS: 'toolbar-columns',
    SEARCH: 'toolbar-search',
  },

  // Pagination patterns
  PAGINATION: {
    FIRST: 'pagination-first',
    PREVIOUS: 'pagination-previous',
    NEXT: 'pagination-next',
    LAST: 'pagination-last',
    PAGE: (page: number) =>
      getTestId({ entity: 'pagination', action: 'page', target: String(page) }),
    PAGE_SIZE: 'pagination-page-size',
  },

  // Detail page patterns
  DETAIL: {
    action: (label: string) =>
      getTestId({
        entity: 'detail-action',
        target: label.toLowerCase().replace(/\s+/g, '-'),
      }),
    field: (name: string) =>
      getTestId({ entity: 'detail-field', target: name }),
    TAB: (name: string) => getTestId({ entity: 'detail-tab', target: name }),
  },

  // Modal/Dialog patterns
  MODAL: {
    ROOT: 'modal',
    CLOSE: 'modal-close',
    CONFIRM: 'modal-confirm',
    CANCEL: 'modal-cancel',
  },
} as const

/**
 * Generates an accessible aria-label for an action button
 *
 * @param action - The action being performed (e.g., "Edit", "Delete")
 * @param entityName - The name of the entity (e.g., "User", "Asset")
 * @param identifier - Optional identifier for the entity (e.g., user name, ID)
 * @returns A descriptive aria-label
 *
 * @example
 * ```typescript
 * getAriaLabel('Edit', 'user', 'John Doe')
 * // Returns: "Edit user John Doe"
 *
 * getAriaLabel('Delete', 'asset')
 * // Returns: "Delete asset"
 * ```
 */
export function getAriaLabel(
  action: string,
  entityName: string,
  identifier?: string
): string {
  const parts = [action, entityName.toLowerCase(), identifier].filter(Boolean)
  return parts.join(' ')
}

/**
 * Generates accessibility attributes for form fields
 *
 * @param field - Field configuration
 * @returns Object with accessibility attributes
 *
 * @example
 * ```typescript
 * const attrs = getFieldAccessibilityAttrs({
 *   name: 'email',
 *   label: 'Email Address',
 *   required: true,
 *   error: 'Invalid email',
 *   description: 'Enter your work email'
 * })
 * // Returns:
 * // {
 * //   'data-testid': 'field-email',
 * //   'aria-label': 'Email Address',
 * //   'aria-required': true,
 * //   'aria-invalid': true,
 * //   'aria-describedby': 'field-email-error field-email-description',
 * //   id: 'field-email'
 * // }
 * ```
 */
export function getFieldAccessibilityAttrs(field: {
  name: string
  label?: string
  required?: boolean
  error?: string | boolean
  description?: string
}): Record<string, unknown> {
  const describedByParts: string[] = []

  if (field.error) {
    describedByParts.push(TEST_IDS.FORM.error(field.name))
  }

  if (field.description) {
    describedByParts.push(TEST_IDS.FORM.description(field.name))
  }

  return {
    'data-testid': TEST_IDS.FORM.field(field.name),
    'aria-label': field.label,
    'aria-required': field.required || undefined,
    'aria-invalid': !!field.error || undefined,
    'aria-describedby':
      describedByParts.length > 0 ? describedByParts.join(' ') : undefined,
    id: TEST_IDS.FORM.field(field.name),
  }
}

/**
 * Generates accessibility attributes for action buttons
 *
 * @param action - Action configuration
 * @returns Object with accessibility attributes
 *
 * @example
 * ```typescript
 * const attrs = getActionAccessibilityAttrs({
 *   id: 'edit',
 *   label: 'Edit',
 *   entityName: 'user',
 *   entityId: '123',
 *   entityLabel: 'John Doe',
 *   loading: false
 * })
 * // Returns:
 * // {
 * //   'data-testid': 'row-action-edit-123',
 * //   'aria-label': 'Edit user John Doe',
 * //   'data-loading': undefined,
 * //   'aria-busy': undefined
 * // }
 * ```
 */
export function getActionAccessibilityAttrs(action: {
  id: string
  label: string
  entityName?: string
  entityId?: string | number
  entityLabel?: string
  loading?: boolean
}): Record<string, unknown> {
  const testId = action.entityId
    ? TEST_IDS.ROW_ACTION.custom(action.id, action.entityId)
    : getTestId({ entity: action.id, target: 'button' })

  const ariaLabel = action.entityName
    ? getAriaLabel(action.label, action.entityName, action.entityLabel)
    : action.label

  return {
    'data-testid': testId,
    'aria-label': ariaLabel,
    'data-loading': action.loading || undefined,
    'aria-busy': action.loading || undefined,
  }
}
