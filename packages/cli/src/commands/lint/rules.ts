/**
 * `telamonjs lint` rules — the list/dialog/hub conventions
 * (see templates/app/AGENTS.md, "Padrão de listas, dialogs e hubs").
 *
 * Config rules run on the CrudConfig of every `config.tsx`; page rules run on
 * every other `.tsx` under the linted dir. A value the AST layer cannot
 * resolve (`'unknown'`) is never reported.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import ts from 'typescript'
import { findAncestorDir, hasI18n } from '../generate/messages-writer.js'
import {
  type Parsed,
  type Resolved,
  arrayElements,
  callsTo,
  deref,
  get,
  imports,
  isFalse,
  isTrue,
  jsxAttr,
  jsxAttrHead,
  jsxAttrString,
  jsxParent,
  jsxTagName,
  jsxTags,
  lineOf,
  maxTabCount,
  numberValue,
  prop,
  resolveComponent,
  stringValue,
} from './ast.js'

export type Severity = 'error' | 'warning'

export interface Finding {
  rule: string
  severity: Severity
  message: string
  file: string
  line: number
}

export interface ConfigContext extends Parsed {
  config: ts.ObjectLiteralExpression
}

export type ConfigRule = (ctx: ConfigContext) => Finding[]
export type PageRule = (ctx: Parsed) => Finding[]

const MAX_TABS = 5
const MIN_PAGE_SIZE = 50
const VALID_SPANS = new Set(['1', '2', '3', '12', 'full'])

function at(ctx: Parsed, node: ts.Node | undefined, rule: string, severity: Severity, message: string): Finding {
  return { rule, severity, message, file: ctx.file, line: node ? lineOf(ctx.sf, node) : 1 }
}

function node(e: Resolved): ts.Node | undefined {
  return e && e !== 'unknown' ? e : undefined
}

// ---------------------------------------------------------------------------
// list.*
// ---------------------------------------------------------------------------

const listInfinite: ConfigRule = (ctx) => {
  const v = get(ctx.sf, ctx.config, 'list.infiniteScroll')
  return isFalse(v)
    ? [at(ctx, node(v), 'list-infinite', 'error', '`list.infiniteScroll: false` — lists use infinite scroll (the default); remove the option')]
    : []
}

const listTitleEmpty: ConfigRule = (ctx) => {
  const out: Finding[] = []
  for (const key of ['title', 'description']) {
    const v = get(ctx.sf, ctx.config, `list.${key}`)
    const s = stringValue(v)
    if (s !== undefined && s.trim() !== '') {
      out.push(at(ctx, node(v), 'list-title-empty', 'warning', `\`list.${key}\` should be \`''\` — the shell breadcrumb already names the page`))
    }
  }
  return out
}

const listPagesize: ConfigRule = (ctx) => {
  const list = get(ctx.sf, ctx.config, 'list')
  const v = get(ctx.sf, ctx.config, 'list.defaultPageSize')
  if (v === 'unknown') return []
  const n = numberValue(v)
  if (v === undefined) {
    return [at(ctx, node(list), 'list-pagesize', 'warning', '`list.defaultPageSize` missing — use 100 (infinite scroll fetches large pages)')]
  }
  if (n !== undefined && n < MIN_PAGE_SIZE) {
    return [at(ctx, node(v), 'list-pagesize', 'warning', `\`list.defaultPageSize: ${n}\` — use ≥ ${MIN_PAGE_SIZE} (100 by default) with infinite scroll`)]
  }
  return []
}

// ---------------------------------------------------------------------------
// actionsConfig.standard.*
// ---------------------------------------------------------------------------

const actionsIconTooltip: ConfigRule = (ctx) => {
  const out: Finding[] = []
  for (const name of ['view', 'edit', 'delete']) {
    const v = get(ctx.sf, ctx.config, `actionsConfig.standard.${name}`)
    if (v === undefined || v === 'unknown' || isFalse(v)) continue
    const d = deref(ctx.sf, v)
    if (isTrue(v) || (d && d !== 'unknown' && !ts.isObjectLiteralExpression(d))) {
      out.push(at(ctx, node(v), 'actions-icon-tooltip', 'error', `\`actionsConfig.standard.${name}\` needs \`{ icon: getIcon('…'), tooltip }\`${name === 'delete' ? ' + `confirmDialog`' : ''}`))
      continue
    }
    if (!d || d === 'unknown' || !ts.isObjectLiteralExpression(d)) continue
    const missing = ['icon', 'tooltip'].filter((k) => prop(ctx.sf, d, k) === undefined)
    if (name === 'delete' && prop(ctx.sf, d, 'confirmDialog') === undefined) missing.push('confirmDialog')
    if (missing.length) {
      out.push(at(ctx, node(v), 'actions-icon-tooltip', 'error', `\`actionsConfig.standard.${name}\` is missing ${missing.map((m) => `\`${m}\``).join(', ')}`))
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// dialogs.view.*
// ---------------------------------------------------------------------------

function viewDialog(ctx: ConfigContext): ts.ObjectLiteralExpression | undefined {
  const v = deref(ctx.sf, get(ctx.sf, ctx.config, 'dialogs.view'))
  return v && v !== 'unknown' && ts.isObjectLiteralExpression(v) ? v : undefined
}

const viewHeader: ConfigRule = (ctx) => {
  const view = viewDialog(ctx)
  if (!view) return []
  const header = prop(ctx.sf, view, 'headerConfig')
  const render = prop(ctx.sf, view, 'renderHeader')
  if (header === undefined && render === undefined) {
    return [at(ctx, view, 'view-header', 'error', '`dialogs.view` has neither `headerConfig` (icon, iconColor, title, gradient, badge) nor `renderHeader`')]
  }
  const h = deref(ctx.sf, header)
  if (!h || h === 'unknown' || !ts.isObjectLiteralExpression(h)) return []
  const missing = ['icon', 'title'].filter((k) => prop(ctx.sf, h, k) === undefined)
  return missing.length
    ? [at(ctx, node(header), 'view-header', 'warning', `\`dialogs.view.headerConfig\` is missing ${missing.map((m) => `\`${m}\``).join(', ')}`)]
    : []
}

const viewContent: ConfigRule = (ctx) => {
  const view = viewDialog(ctx)
  if (!view) return []
  if (prop(ctx.sf, view, 'renderContent') === undefined && prop(ctx.sf, view, 'portal') === undefined) {
    return [at(ctx, view, 'view-content', 'error', '`dialogs.view` has neither `renderContent` (≤5 sections: `<XDetail/>` with ContentTabs) nor `portal` (6+ sections)')]
  }
  return []
}

function viewComponent(ctx: ConfigContext): Parsed | undefined {
  const view = viewDialog(ctx)
  if (!view) return undefined
  return resolveComponent(ctx, prop(ctx.sf, view, 'renderContent'))
}

const RAW_TABS = new Set(['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'])

const viewTabs: ConfigRule = (ctx) => {
  const comp = viewComponent(ctx)
  if (!comp) return []
  const raw = [...imports(comp.sf)].filter(
    ([local, spec]) => RAW_TABS.has(local) && (spec === '@telamonjs/ui' || spec.startsWith('@radix-ui/'))
  )
  return raw.length
    ? [at(comp, undefined, 'view-tabs', 'error', `imports \`${raw.map(([l]) => l).join(', ')}\` (raw Tabs) — the Detail uses \`ContentTabs … flush\``)]
    : []
}

const dialogHeight: ConfigRule = (ctx) => {
  const comp = viewComponent(ctx)
  if (!comp || !comp.text.includes('ContentTabs')) return []
  return comp.text.includes('h-[min(')
    ? []
    : [at(comp, undefined, 'dialog-height', 'warning', 'Detail with `ContentTabs` but no fixed height — wrap each tab in `h-[min(600px,60vh)] overflow-y-auto`')]
}

const portalSize: ConfigRule = (ctx) => {
  const comp = viewComponent(ctx)
  if (!comp || !comp.text.includes('ContentTabs')) return []
  const n = maxTabCount(comp.sf)
  return n > MAX_TABS
    ? [at(comp, undefined, 'portal-size', 'warning', `Detail with ${n} ContentTabs tabs — with 6+ sections use \`dialogs.view.portal\``)]
    : []
}

// ---------------------------------------------------------------------------
// form.sections[].fields[].span
// ---------------------------------------------------------------------------

const formSpan: ConfigRule = (ctx) => {
  const out: Finding[] = []
  const sections = arrayElements(ctx.sf, get(ctx.sf, ctx.config, 'form.sections')) ?? []
  for (const section of sections) {
    if (!ts.isObjectLiteralExpression(section)) continue
    const rows = arrayElements(ctx.sf, prop(ctx.sf, section, 'fields')) ?? []
    // fields may be flat (FormField[]) or row-based (FormField[][])
    const fields = rows.flatMap((r) => (ts.isArrayLiteralExpression(r) ? [...r.elements] : [r]))
    for (const field of fields) {
      if (!ts.isObjectLiteralExpression(field)) continue
      const span = prop(ctx.sf, field, 'span')
      const s = stringValue(span)
      if (s !== undefined && !VALID_SPANS.has(s)) {
        out.push(at(ctx, node(span), 'form-span', 'error', `\`span: '${s}'\` is invalid — use '1' | '2' | '3' | '12' | 'full' (BaseForm builds \`col-span-\${span}\`)`))
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Layer rule
// ---------------------------------------------------------------------------

const noFetchInConfig: ConfigRule = (ctx) =>
  callsTo(ctx.sf, 'fetch').map((c) =>
    at(ctx, c, 'no-fetch-in-config', 'error', '`fetch()` in config.tsx — only `src/lib/api/<module>-client.ts` calls fetch')
  )

const CRUD_PAGES = ['adicionar/page.tsx', 'new/page.tsx', '[id]/page.tsx', '[id]/editar/page.tsx', '[id]/edit/page.tsx']

const noCrudPages: ConfigRule = (ctx) => {
  const dir = dirname(ctx.file)
  return CRUD_PAGES.filter((p) => existsSync(join(dir, p))).map((p) => ({
    rule: 'no-crud-pages',
    severity: 'error' as const,
    message: `route \`${p}\` is not allowed — CRUD happens in the ListPage dialogs (\`dialogs.create/edit/view\`)`,
    file: join(dir, p),
    line: 1,
  }))
}

// ---------------------------------------------------------------------------
// Page rules (hubs)
// ---------------------------------------------------------------------------

const hubTabs: PageRule = (ctx) => {
  const calls = callsTo(ctx.sf, 'useTabUrlSync')
  if (!calls.length) return []
  // Already a portal: AdminPortal in the file, or the launcher state (`allowNone: true`).
  if (imports(ctx.sf).has('AdminPortal') || jsxTags(ctx.sf).some((t) => jsxTagName(t) === 'AdminPortal')) return []
  let n = 0
  const arg = calls[0].arguments[0]
  if (arg && ts.isObjectLiteralExpression(arg)) {
    if (isTrue(prop(ctx.sf, arg, 'allowNone'))) return []
    n = arrayElements(ctx.sf, prop(ctx.sf, arg, 'tabs'))?.length ?? 0
  }
  if (!n) n = maxTabCount(ctx.sf)
  return n > MAX_TABS
    ? [at(ctx, calls[0], 'hub-tabs', 'warning', `hub with ${n} AdminTabs/useTabUrlSync tabs — with 6+ sections use \`AdminPortal\``)]
    : []
}

// ---------------------------------------------------------------------------
// JSX rules (pages + configs)
// ---------------------------------------------------------------------------

const noRawLink: PageRule = (ctx) => {
  // `Link` only counts when it is next/link (lucide also exports a `Link` icon).
  const isNextLink = imports(ctx.sf).get('Link') === 'next/link'
  return jsxTags(ctx.sf)
    .filter((n) => {
      const tag = jsxTagName(n)
      if (tag === 'a') {
        if (jsxAttrString(n, 'target') === '_blank' || jsxAttr(n, 'download')) return false
        if (/^(mailto|tel):/.test(jsxAttrHead(n, 'href') ?? '')) return false
      } else if (!(tag === 'Link' && isNextLink)) return false
      const parent = jsxParent(n)
      return !(parent && jsxAttr(parent, 'asChild'))
    })
    .map((n) => at(ctx, n, 'no-raw-link', 'error', 'navigation must be `<Button asChild><Link …/></Button>` — not a raw `<a>`/`<Link>`'))
}

const buttonIconSize: PageRule = (ctx) =>
  jsxTags(ctx.sf)
    .filter((n) => {
      if (!/^[A-Z]/.test(jsxTagName(n)) || jsxAttr(n, 'size')) return false
      const parent = jsxParent(n)
      if (!parent || jsxTagName(parent) !== 'Button' || jsxAttr(parent, 'asChild')) return false
      const cls = jsxAttrString(n, 'className')
      return cls !== undefined && !/\bh-4 w-4\b|\bsize-4\b/.test(cls)
    })
    .map((n) => at(ctx, n, 'button-icon-size', 'warning', 'an icon inside Button uses `mr-2 h-4 w-4`'))

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

/** Walks up from `configFile`'s directory looking for an app root with i18n set up. */
function configHasI18n(configFile: string): boolean {
  return findAncestorDir(dirname(configFile), hasI18n) !== undefined
}

function unwrapExpr(e: ts.Expression): ts.Expression {
  let x = e
  for (;;) {
    if (ts.isParenthesizedExpression(x)) x = x.expression
    else if (ts.isAsExpression(x) || ts.isSatisfiesExpression(x)) x = x.expression
    else return x
  }
}

function objPropName(p: ts.ObjectLiteralElementLike): string | undefined {
  const n = (p as ts.PropertyAssignment).name
  if (!n) return undefined
  return ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : undefined
}

const I18N_TARGET_KEYS = new Set(['title', 'label', 'header', 'placeholder', 'description'])
// Same word list as packages/ui/scripts/check-i18n-literals.mjs (regex copied, not imported --
// ui and cli are separate packages, no cross-package import).
const I18N_WORDS =
  /\b(Salvar|Cancelar|Buscar|Excluir|Carregando|Nenhum|Nenhuma|Confirmar|Voltar|Anterior|Selecione|Filtros?|Limpar|Novo|Nova|Editar|Fechar|Sair|Entrar|Remover|Adicionar|Enviar|Sim|Não|Página|Exportar|Atualizar|Visualizar|Detalhes|Ativo|Inativo|Hoje|Ontem|Total|Todos|Obrigatório|Opcional)\b/
const I18N_ACCENT = /[ãõáéíóúâêôçÃÕÁÉÍÓÚÂÊÔÇ]/

/**
 * True when `label` sits in an `IOption`-shaped object literal -- `{ value:
 * ..., label: ... }` (or `{ id: ..., label: ... }`), the shape `loadField`
 * callbacks return (`items.map(i => ({ value: i.id, label: i.nome }))`).
 * There `label` is domain data (the option's display text, e.g. a person's
 * name), not UI chrome -- unlike `FormField.label`/`ActionConfig.label`/a
 * column header/a section label, which always describe the UI itself.
 * AST-based (not a line-proximity heuristic): looks at the enclosing object
 * literal's own properties, so it's exact regardless of formatting/line
 * breaks -- the only gap is a `label` that comes from a spread
 * (`{ ...opt, label: x }`) whose `value`/`id` lives in the spread source;
 * that still gets flagged (false positive, not a false negative -- errs
 * toward "ask a human to add `// i18n-ignore`" rather than silently missing
 * a real chrome literal).
 */
function isOptionShapedLabel(labelProp: ts.PropertyAssignment): boolean {
  const parent = labelProp.parent
  if (!ts.isObjectLiteralExpression(parent)) return false
  return parent.properties.some((p) => {
    const k = objPropName(p)
    return k === 'value' || k === 'id'
  })
}

/**
 * `title:`/`label:`/`header:`/`placeholder:`/`description:` with a pt-BR string
 * literal (accent or a common UI word) anywhere in config.tsx -- not just inside
 * the CrudConfig object literal itself: `columns`/`formSections` are commonly
 * declared as separate top-level consts and referenced by shorthand. Only
 * checked when the app has i18n set up (`hasI18n`), so apps without i18n keep
 * emitting literals without being flagged. `label` is exempted when it's an
 * `IOption`-shaped literal (see `isOptionShapedLabel`) -- domain data, not chrome.
 */
const i18nLiteralInConfig: ConfigRule = (ctx) => {
  if (!configHasI18n(ctx.file)) return []
  const out: Finding[] = []
  const visit = (n: ts.Node): void => {
    if (ts.isPropertyAssignment(n)) {
      const key = objPropName(n)
      if (key && I18N_TARGET_KEYS.has(key) && !(key === 'label' && isOptionShapedLabel(n))) {
        const init = unwrapExpr(n.initializer)
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
          const text = init.text
          if (I18N_ACCENT.test(text) || I18N_WORDS.test(text)) {
            out.push(
              at(
                ctx,
                n,
                'i18n-literal-in-config',
                'error',
                `\`${key}: '${text}'\` — pt-BR literal in config.tsx; use \`msg('<key>')\``
              )
            )
          }
        }
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(ctx.sf)
  return out
}

const iconsFromRegistry: ConfigRule = (ctx) =>
  ctx.sf.statements
    .filter(
      (st): st is ts.ImportDeclaration =>
        ts.isImportDeclaration(st) &&
        ts.isStringLiteral(st.moduleSpecifier) &&
        st.moduleSpecifier.text === 'lucide-react' &&
        !st.importClause?.isTypeOnly
    )
    .map((st) => at(ctx, st, 'icons-from-registry', 'error', "config.tsx uses `getIcon('Name')` from `@/lib/icons`, not `lucide-react` directly"))

export const configRules: Record<string, ConfigRule> = {
  'list-infinite': listInfinite,
  'list-title-empty': listTitleEmpty,
  'list-pagesize': listPagesize,
  'actions-icon-tooltip': actionsIconTooltip,
  'view-header': viewHeader,
  'view-content': viewContent,
  'view-tabs': viewTabs,
  'dialog-height': dialogHeight,
  'form-span': formSpan,
  'no-fetch-in-config': noFetchInConfig,
  'no-crud-pages': noCrudPages,
  'portal-size': portalSize,
  'icons-from-registry': iconsFromRegistry,
  'no-raw-link': noRawLink,
  'button-icon-size': buttonIconSize,
  'i18n-literal-in-config': i18nLiteralInConfig,
}

export const pageRules: Record<string, PageRule> = {
  'hub-tabs': hubTabs,
  'no-raw-link': noRawLink,
  'button-icon-size': buttonIconSize,
}
