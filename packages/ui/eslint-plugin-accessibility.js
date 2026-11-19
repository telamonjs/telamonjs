/**
 * Custom ESLint Plugin for telamonjs Accessibility Rules
 *
 * Enforces data-testid and aria-label on interactive elements.
 */

export default {
  meta: {
    name: 'eslint-plugin-telamonjs-accessibility',
    version: '1.0.0',
  },
  rules: {
    /**
     * Enforce data-testid or aria-label on buttons
     */
    'button-accessibility': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce data-testid or aria-label on button elements',
          category: 'Accessibility',
          recommended: true,
        },
        messages: {
          missingAttributes:
            'Button elements must have either data-testid or aria-label for accessibility and testing. Add one of: data-testid="{{suggestion}}" or aria-label="{{ariaLabel}}"',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            // Handle JSXIdentifier (e.g., <Button>) vs JSXMemberExpression (e.g., <Icon.Button>)
            const elementName = node.name.name || node.name.property?.name

            // Skip if no element name (e.g., JSXFragment)
            if (!elementName) return

            // Check if it's a button or Button component
            if (
              elementName !== 'button' &&
              elementName !== 'Button' &&
              !elementName.includes('Button')
            ) {
              return
            }

            // A spread may carry the attributes (e.g. {...accessibilityAttrs}
            // from getFieldAccessibilityAttrs) — static analysis cannot prove
            // absence, so a present spread = satisfied.
            const hasSpread = node.attributes.some(
              attr => attr.type === 'JSXSpreadAttribute'
            )
            if (hasSpread) {
              return
            }

            // Check if it has data-testid or aria-label
            const hasDataTestId = node.attributes.some(
              attr =>
                attr.type === 'JSXAttribute' && attr.name.name === 'data-testid'
            )

            const hasAriaLabel = node.attributes.some(
              attr =>
                attr.type === 'JSXAttribute' && attr.name.name === 'aria-label'
            )

            if (!hasDataTestId && !hasAriaLabel) {
              // Try to suggest a test ID based on context
              const suggestion = context
                .getSourceCode()
                .getText(node)
                .includes('submit')
                ? 'submit-button'
                : context.getSourceCode().getText(node).includes('cancel')
                  ? 'cancel-button'
                  : context.getSourceCode().getText(node).includes('edit')
                    ? 'edit-button'
                    : 'action-button'

              const ariaLabel = suggestion.replace(/-/g, ' ')

              context.report({
                node,
                messageId: 'missingAttributes',
                data: {
                  suggestion,
                  ariaLabel,
                },
              })
            }
          },
        }
      },
    },

    /**
     * Enforce aria-label on form inputs
     */
    'input-accessibility': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce aria-label on input elements without labels',
          category: 'Accessibility',
          recommended: true,
        },
        messages: {
          missingAriaLabel:
            'Input elements should have aria-label for screen readers. Add: aria-label="{{suggestion}}"',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            // Handle JSXIdentifier vs JSXMemberExpression
            const elementName = node.name.name || node.name.property?.name

            // Skip if no element name
            if (!elementName) return

            // Check if it's an input, Input, or form field component
            if (
              elementName !== 'input' &&
              elementName !== 'Input' &&
              elementName !== 'Select' &&
              elementName !== 'Textarea'
            ) {
              return
            }

            // type='hidden' is not perceivable — an aria-label would be meaningless.
            const isHidden = node.attributes.some(
              attr =>
                attr.type === 'JSXAttribute' &&
                attr.name.name === 'type' &&
                attr.value &&
                attr.value.type === 'Literal' &&
                attr.value.value === 'hidden'
            )
            if (isHidden) {
              return
            }

            // Same rationale as the button rule: a spread may carry aria-label.
            const hasSpreadInput = node.attributes.some(
              attr => attr.type === 'JSXSpreadAttribute'
            )
            if (hasSpreadInput) {
              return
            }

            // Check if it has aria-label or aria-labelledby
            const hasAriaLabel = node.attributes.some(
              attr =>
                attr.type === 'JSXAttribute' &&
                (attr.name.name === 'aria-label' ||
                  attr.name.name === 'aria-labelledby')
            )

            // Exception: if it has a name attribute, we can use that for suggestion
            const nameAttr = node.attributes.find(
              attr => attr.type === 'JSXAttribute' && attr.name.name === 'name'
            )

            if (!hasAriaLabel && nameAttr) {
              const suggestion = nameAttr.value?.value || 'field'

              context.report({
                node,
                messageId: 'missingAriaLabel',
                data: {
                  suggestion,
                },
              })
            }
          },
        }
      },
    },

    /**
     * Enforce data-testid on form field components
     */
    'field-testid': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Encourage data-testid on field components for easier testing',
          category: 'Best Practices',
          recommended: false,
        },
        messages: {
          missingTestId:
            'Field components should have data-testid for E2E testing. Add: data-testid="field-{{fieldName}}"',
        },
        schema: [],
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            // Handle JSXIdentifier vs JSXMemberExpression
            const elementName = node.name.name || node.name.property?.name

            // Skip if no element name
            if (!elementName) return

            // Check if it's a field component
            if (
              !elementName.includes('Field') &&
              !elementName.includes('Input') &&
              !elementName.includes('Select')
            ) {
              return
            }

            // Check if it has data-testid
            const hasDataTestId = node.attributes.some(
              attr =>
                attr.type === 'JSXAttribute' && attr.name.name === 'data-testid'
            )

            // Get field name for suggestion
            const nameAttr = node.attributes.find(
              attr => attr.type === 'JSXAttribute' && attr.name.name === 'name'
            )

            if (!hasDataTestId && nameAttr) {
              const fieldName = nameAttr.value?.value || 'unknown'

              context.report({
                node,
                messageId: 'missingTestId',
                data: {
                  fieldName,
                },
              })
            }
          },
        }
      },
    },
  },
}
