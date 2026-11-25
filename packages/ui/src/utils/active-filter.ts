import { msg } from '../i18n/msg'
import type { ToolbarFilterConfig } from '../types/crud'

/** What `activeFilter()` lets you override: everything but the options. */
export type ActiveFilterOptions = Partial<
  Pick<ToolbarFilterConfig, 'label' | 'defaultValue' | 'displayMode' | 'className'>
>

/**
 * Toolbar filter preset for a boolean "active" column: All / Active / Inactive,
 * labelled by the library messages. Sends `?<key>=true|false` (what a
 * `'boolean'` filter of `@telamonjs/data` parses) and nothing for
 * "All" (`allValue: 'all'`).
 *
 * ```ts
 * list: { toolbar: { filters: [activeFilter('ativo', { defaultValue: 'true' })] } }
 * ```
 */
export function activeFilter(
  key = 'active',
  options: ActiveFilterOptions = {}
): ToolbarFilterConfig {
  return {
    key,
    label: msg('telamonjs.list.activeFilterLabel'),
    allValue: 'all',
    options: [
      { value: 'all', label: msg('telamonjs.list.all') },
      { value: 'true', label: msg('telamonjs.list.activeFilterActive') },
      { value: 'false', label: msg('telamonjs.list.activeFilterInactive') },
    ],
    ...options,
  }
}
