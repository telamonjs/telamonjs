/**
 * Template for `_components/<Entity>Detail.tsx` -- the body of the view
 * dialog (`dialogs.view.renderContent`). Never a route of its own.
 * Reference: packages/cli/templates/app/src/app/admin/usuarios/_components/UsuarioDetail.tsx
 *
 * Fields are grouped by the section prisma-detector assigns (main / contact
 * / meta): main + contact go in the "Informações" tab, meta (timestamps) in
 * "Auditoria". Credential fields are never rendered.
 */
import { PrismaField } from '../utils/prisma-detector.js'
import { capitalize } from '../utils/formatters.js'
import { fieldPropName, isSensitive } from '../utils/field-mapping.js'

export interface DetailOptions {
  name: string
  modelName: string
  fields: PrismaField[]
  /** App has i18n wired up (see messages-writer.ts `hasI18n`) -- emit `msg()` instead of literals. */
  i18n?: boolean
}

export function generateDetail(options: DetailOptions): string {
  const { name, modelName, fields, i18n = false } = options
  const Entity = capitalize(modelName)
  const msgKey = (key: string) => `msg('${name}.${key}')`

  const visible = fields.filter(f => !f.isId && !isSensitive(f))
  const main = visible.filter(f => f.section !== 'contact' && f.section !== 'meta')
  const contact = visible.filter(f => f.section === 'contact')
  const meta = visible.filter(f => f.section === 'meta')
  const needsFormatDate = visible.some(f => f.type === 'DateTime')

  // `SemanticField.label` and `SemanticCard.title` are `I18nText` -- reuse the same
  // `<mod>.fields.<prop>` key `config.ts`'s template already writes for this field
  // (via `writeModuleMessages`/`moduleMessagesBlock` in crud.ts) rather than a new one.
  const fieldLabel = (f: PrismaField) => (i18n ? msgKey(`fields.${fieldPropName(f)}`) : `'${capitalize(f.name)}'`)
  const sectionTitle = (sectionKey: string, literal: string) => (i18n ? msgKey(`sections.${sectionKey}`) : `'${literal}'`)

  const card = (sectionKey: string, literalTitle: string, icon: string, color: string, list: PrismaField[]) =>
    `            <SemanticCard title={${sectionTitle(sectionKey, literalTitle)}} icon={${icon}} color='${color}'>
${list.map(f => `              <SemanticField label={${fieldLabel(f)}} value={${valueExpr(f)}} />`).join('\n')}
            </SemanticCard>`

  // `TabItem.label` is a plain `string` (not `I18nText`) -- can't take `msg()`; stays literal.
  const tab = (value: string, label: string, icon: string, cards: string[]) =>
    `    {
      value: '${value}',
      label: '${label}',
      icon: '${icon}',
      content: (
        <div className={\`p-6 \${contentHeight}\`}>
          <div className='grid gap-4 md:grid-cols-2'>
${cards.join('\n')}
          </div>
        </div>
      ),
    },`

  const infoCards = [card('main', 'Dados', 'InfoIcon', 'blue', main)]
  if (contact.length) infoCards.push(card('contact', 'Contato', 'MailIcon', 'green', contact))
  const tabs = [tab('info', 'Informações', 'Info', infoCards)]
  if (meta.length) tabs.push(tab('auditoria', 'Auditoria', 'History', [card('meta', 'Registro', 'CalendarIcon', 'purple', meta)]))

  return `'use client'

import { memo } from 'react'
import { ContentTabs, SemanticCard, SemanticField, type TabItem } from '@telamonjs/ui'
import { getIcon } from '@/lib/icons'
${i18n ? `import { msg } from '@telamonjs/ui/i18n'\n` : ''}${needsFormatDate ? `import { formatDate } from '@/lib/utils'\n` : ''}import type { ${Entity} } from '@/lib/api/${name}-client'

const InfoIcon = getIcon('Info')
${contact.length ? `const MailIcon = getIcon('Mail')\n` : ''}${meta.length ? `const CalendarIcon = getIcon('Calendar')\n` : ''}
interface ${Entity}DetailProps {
  item: ${Entity}
}

/**
 * Rendered INSIDE the view dialog (\`dialogs.view.renderContent\`) -- never on
 * its own route. Up to 5 sections: ContentTabs. 6+ sections: switch the
 * config to \`dialogs.view.portal\`.
 */
function ${Entity}Detail({ item }: ${Entity}DetailProps) {
  // Fixed height: the dialog must not resize when switching tabs.
  const contentHeight = 'h-[min(600px,60vh)] overflow-y-auto'

  const tabs: TabItem[] = [
${tabs.join('\n')}
  ]

  return <ContentTabs tabs={tabs} variant='default' defaultValue='info' flush />
}

export default memo(${Entity}Detail)
`
}

/** `SemanticField` takes `string | number | null | undefined`. */
function valueExpr(field: PrismaField): string {
  const v = `item.${fieldPropName(field)}`
  if (field.type === 'Boolean') return `${v} ? 'Sim' : 'Não'`
  if (field.type === 'DateTime') return field.isRequired ? `formatDate(${v})` : `${v} ? formatDate(${v}) : null`
  return v
}
