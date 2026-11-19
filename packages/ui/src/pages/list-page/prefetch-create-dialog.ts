/** Warms the create-dialog chunk (called on hover/focus of the add button). */
export const prefetchCreateDialog = (): void => {
  void import('../../components/dialog/create-dialog')
}
