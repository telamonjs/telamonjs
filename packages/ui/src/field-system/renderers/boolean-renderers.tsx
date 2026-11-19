'use client'

import { Switch } from '../../ui/switch'
import { Label } from '../../ui/label'
import { getFieldAccessibilityAttrs } from '../../utils/test-ids'
import type { FieldRenderer } from './types'

export const BooleanRenderer: FieldRenderer = {
  render: ({ field }) => {
    const accessibilityAttrs = getFieldAccessibilityAttrs({
      name: field.name,
      label: field.label,
      required: field.required,
      error: field.error,
      description: field.description,
    })

    return (
      <div className='flex items-center space-x-2 pt-2'>
        <Switch
          {...accessibilityAttrs}
          disabled={field.readOnly}
          checked={Boolean(field.value || false)}
          onCheckedChange={checked => {
            field.onChange(checked)
          }}
        />
        {field.description && (
          <Label htmlFor={field.name} className='text-sm text-muted-foreground'>
            {field.description}
          </Label>
        )}
      </div>
    )
  },
}
