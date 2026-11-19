import type { DialogHeaderConfig } from '../../types/dialog-header'

/**
 * Header config for a create/edit FORM: the same as the view's, without the
 * stats cards — in a form they repeat the fields being edited and show the
 * saved value while the user types a new one
 */
export function formHeaderConfig<T>(
  config: DialogHeaderConfig<T>
): DialogHeaderConfig<T> {
  return config.stats ? { ...config, stats: undefined } : config
}
