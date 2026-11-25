import type { MessagesShape } from '../shape'
import type { admin as base } from '../pt-BR/admin'

export const admin = {
  permissionMatrix: {
    caption: 'Permission matrix',
    permission: 'Permission',
    search: 'Search permission...',
    searchLabel: 'Search permission',
    noResults: 'No permission found.',
    system: 'System',
    cellLabel: '{permission} for {role}',
    groupLabel: 'All {group} permissions for {role}',
    toggleError: 'Could not update the permission.',
  },
  auditChanges: {
    field: 'Field',
    value: 'Value',
    before: 'Before',
    after: 'After',
    empty: 'No changes recorded.',
    noChangedFields: 'No field changed.',
    showAll: 'Show all fields ({count})',
    showChanged: 'Show changed only',
    redacted: 'redacted',
    entries: '{count, plural, one {# entry} other {# entries}}',
  },
} satisfies MessagesShape<typeof base>
