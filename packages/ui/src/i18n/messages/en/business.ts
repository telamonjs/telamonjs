import type { MessagesShape } from '../shape'
import type { business as base } from '../pt-BR/business'

export const business = {
  calendar: {
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    more: '+{count, number} more',
  },
  kanban: {
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
  },
  selector: {
    searchPlaceholder: 'Search...',
    filterPlaceholder: 'Filter...',
    searching: 'Searching...',
    searchAria: 'Search options',
    noOptions: 'No options found.',
    noResults: 'No results',
    noResultsFound: 'No results found.',
    selectAll: 'Select all',
    selected: '{count, plural, one {# selected} other {# selected}}',
    selectedWord: 'selected',
    selectedOfMax:
      '{count, plural, one {# selected} other {# selected}} / {max, number}',
    choosePlaceholder: 'Choose an option...',
    comboboxLabel: 'Combobox {name}',
    multiselectLabel: 'Multi-select {name}',
    opened: 'Multi-select opened',
    closed: 'Multi-select closed',
    loadError: 'Error loading options',
    createError: 'Error creating option',
    errorPrefix: 'Error: {message}',
    creating: 'Creating...',
    createOption: 'Create "{value}"',
    createdAndAdded: 'Created and added: {label}',
    removed: 'Removed: {label}',
    added: 'Added: {label}',
    maxReached: 'Maximum of {max, number} selections reached',
  },
  pagination: {
    active: 'Active',
    inactive: 'Inactive',
  },
} satisfies MessagesShape<typeof base>
