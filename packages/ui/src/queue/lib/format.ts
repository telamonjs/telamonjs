/**
 * Formats a queue/job name for display: strips the leading `module_` prefix
 * (text up to and including the first underscore), then turns every
 * remaining underscore or hyphen into a space and title-cases each word.
 *
 * Shared by every queue dashboard component so `gateway_processar-ids` and
 * `imports_sync_records` render identically everywhere ("Processar Ids",
 * "Sync Records") instead of each component re-implementing (and subtly
 * diverging on) the same regex.
 *
 * @example
 * formatQueueName('gateway_processar-ids') // 'Processar Ids'
 * formatQueueName('imports_sync_records')  // 'Sync Records'
 * formatQueueName('standalone')            // 'Standalone'
 * formatQueueName('')                      // ''
 */
export function formatQueueName(name: string): string {
  if (!name) return name
  return name
    .replace(/^[^_]+_/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}
