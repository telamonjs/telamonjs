/**
 * Dialog state machine for ListPage (internal)
 *
 * A single discriminated-union slot replaces the 3 distributed boolean+id pairs
 * the dialogs hook used to carry. Mutual exclusion becomes structural (there is
 * exactly one open dialog at a time) and the view→edit handoff collapses to one
 * transition with no ordering hazard.
 *
 * @internal
 */

/** Closed, or exactly one of view/edit (entity-bound) / create (id-less). */
export type DialogState =
  | { type: null; id: null }
  | { type: 'view'; id: string }
  | { type: 'edit'; id: string }
  | { type: 'create'; id: null }

export const CLOSED_DIALOG: DialogState = { type: null, id: null }

export type DialogAction =
  | { kind: 'open'; type: 'view' | 'edit'; id: string }
  | { kind: 'openCreate' }
  /** View → Edit handoff: keep the id, switch the type. No-op if not in view. */
  | { kind: 'viewToEdit' }
  | { kind: 'close' }
  /** URL → state: reconcile to whatever the address bar asks for. */
  | { kind: 'syncFromUrl'; next: DialogState }

export function dialogReducer(
  state: DialogState,
  action: DialogAction
): DialogState {
  switch (action.kind) {
    case 'open':
      return { type: action.type, id: action.id }
    case 'openCreate':
      return { type: 'create', id: null }
    case 'viewToEdit':
      return state.type === 'view' ? { type: 'edit', id: state.id } : state
    case 'close':
      return CLOSED_DIALOG
    case 'syncFromUrl':
      return action.next
    default: {
      // Exhaustiveness guard — a new action kind must be handled above.
      const _never: never = action
      return _never
    }
  }
}
