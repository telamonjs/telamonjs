'use client'

import { useState, type ReactNode } from 'react'
import { Tabs, Tab } from 'fumadocs-ui/components/tabs'
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'

export interface PreviewControl {
  /** Prop name passed to the render function. */
  prop: string
  /** Label shown next to the control. Defaults to `prop`. */
  label?: string
  type: 'boolean' | 'select'
  /** Required for type: 'select'. */
  options?: string[]
  default?: boolean | string
}

interface ComponentPreviewProps {
  /** Source snippet shown in the "Code" tab. */
  code: string
  controls?: PreviewControl[]
  /**
   * Static content, or a render function receiving the current knob values
   * when `controls` is set.
   */
  children: ReactNode | ((values: Record<string, boolean | string>) => ReactNode)
}

/**
 * Preview | Code tabs wrapping a REAL telamonjs-ui component. Used by the
 * `*Preview` demos in `components/previews/` — those own the telamonjs-ui
 * import and any knob wiring; this component only owns the frame + tabs.
 */
export function ComponentPreview({
  code,
  controls,
  children,
}: ComponentPreviewProps) {
  const [values, setValues] = useState<Record<string, boolean | string>>(
    () =>
      Object.fromEntries(
        (controls ?? []).map(c => [c.prop, c.default ?? false])
      )
  )

  const rendered = typeof children === 'function' ? children(values) : children

  return (
    <div className='not-prose my-6 overflow-hidden rounded-xl border border-fd-border'>
      <Tabs items={['Preview', 'Code']}>
        <Tab value='Preview'>
          <div className='flex min-h-40 flex-wrap items-center justify-center gap-4 bg-fd-background p-8'>
            {rendered}
          </div>
          {controls && controls.length > 0 && (
            <div className='flex flex-wrap gap-4 border-t border-fd-border bg-fd-card px-4 py-3'>
              {controls.map(control => (
                <label
                  key={control.prop}
                  className='flex items-center gap-2 text-sm text-fd-muted-foreground'
                >
                  {control.label ?? control.prop}
                  {control.type === 'boolean' ? (
                    <input
                      type='checkbox'
                      checked={Boolean(values[control.prop])}
                      onChange={e =>
                        setValues(v => ({
                          ...v,
                          [control.prop]: e.target.checked,
                        }))
                      }
                    />
                  ) : (
                    <select
                      value={String(values[control.prop])}
                      onChange={e =>
                        setValues(v => ({
                          ...v,
                          [control.prop]: e.target.value,
                        }))
                      }
                      className='rounded border border-fd-border bg-fd-background px-2 py-1'
                    >
                      {control.options?.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              ))}
            </div>
          )}
        </Tab>
        <Tab value='Code'>
          <DynamicCodeBlock lang='tsx' code={code} />
        </Tab>
      </Tabs>
    </div>
  )
}
