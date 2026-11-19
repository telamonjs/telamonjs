/**
 * Marks an error whose toast was already shown (useCrudMutations.onError), so the
 * caller up the chain (AdminForm submit, DataTableActions) doesn't toast it again.
 * Internal — not exported from the barrel.
 */
const TOASTED = Symbol.for('telamonjs.toasted')

export function markToasted(error: unknown): void {
  if (typeof error === 'object' && error !== null && Object.isExtensible(error)) {
    Object.defineProperty(error, TOASTED, { value: true })
  }
}

export function wasToasted(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as Record<symbol, unknown>)[TOASTED] === true
}
