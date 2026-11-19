import type { MessagesShape } from '../shape'
import type { impersonation as base } from '../pt-BR/impersonation'

export const impersonation = {
  title: 'Log in as another user',
  description:
    "Select a user to view the system with their permissions. You'll be able to return to your own user at any time.",
  searchPlaceholder: 'Search by name or email...',
  emptyMessage: 'No users found',
  confirmLabel: 'Log in as user',
  userLabel: 'User',
  searching: 'Searching users...',
  searchError: 'Could not search for users. Please try again.',
  confirmError: 'Could not start impersonation.',
  confirming: 'Logging in...',
  bannerLabel: 'Impersonation mode',
  actingAs: '— you are acting as <strong>{name}</strong>.',
  actingAsWithOriginal:
    '— you are acting as <strong>{name}</strong>. Your real account is <strong>{original}</strong>.',
  unknownUser: 'another user',
  returning: 'Returning...',
  backTo: 'Back to {name}',
  backToGeneric: 'Back to original',
  stopSuccessDescription: 'You returned to your original user',
  stopErrorDescription: 'Error stopping impersonation. Please try again.',
} satisfies MessagesShape<typeof base>
