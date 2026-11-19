/**
 * Thin AST helpers for `telamonjs lint` — `ts.createSourceFile` only, no
 * Program/type-checker (fast, no node_modules resolution needed).
 *
 * Everything the linter cannot resolve statically (spreads of non-local
 * values, computed keys, function results) comes back as `'unknown'` and the
 * rules treat it as "cannot tell" — never as a violation.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import ts from 'typescript'

export interface Parsed {
  file: string
  text: string
  sf: ts.SourceFile
}

export type Resolved = ts.Expression | 'unknown' | undefined

export function parse(file: string): Parsed {
  const text = readFileSync(file, 'utf-8')
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return { file, text, sf }
}

export function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
}

function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr
  for (;;) {
    if (ts.isParenthesizedExpression(e)) e = e.expression
    else if (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isTypeAssertionExpression(e)) e = e.expression
    else return e
  }
}

function typeName(node: ts.TypeNode | undefined): string | undefined {
  if (!node || !ts.isTypeReferenceNode(node)) return undefined
  const n = node.typeName
  return ts.isIdentifier(n) ? n.text : n.right.text
}

/** Top-level `const X = ...` initializer (exported or not), by name. */
export function resolveIdent(sf: ts.SourceFile, name: string): ts.Expression | undefined {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer) return unwrap(d.initializer)
    }
  }
  return undefined
}

/** Follow identifiers to their same-file `const` initializer; unwrap casts. */
export function deref(sf: ts.SourceFile, expr: Resolved): Resolved {
  if (!expr || expr === 'unknown') return expr
  let e = unwrap(expr)
  for (let i = 0; i < 5 && ts.isIdentifier(e); i++) {
    const next = resolveIdent(sf, e.text)
    if (!next) return 'unknown'
    e = next
  }
  return e
}

/**
 * The module's CrudConfig object literal: a top-level variable whose
 * initializer is `satisfies`/`as CrudConfig`, whose type annotation is
 * `CrudConfig<...>`, or (heuristic) an object literal with `list` + `query`.
 */
export function findCrudConfig(sf: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  let heuristic: ts.ObjectLiteralExpression | undefined
  for (const st of sf.statements) {
    // Factory: `function buildXConfig(ctx): CrudConfig<…> { return { … } }`
    if (ts.isFunctionDeclaration(st) && typeName(st.type) === 'CrudConfig' && st.body) {
      for (const inner of st.body.statements) {
        if (ts.isReturnStatement(inner) && inner.expression) {
          const obj = unwrap(inner.expression)
          if (ts.isObjectLiteralExpression(obj)) return obj
        }
      }
    }
    if (!ts.isVariableStatement(st)) continue
    for (const d of st.declarationList.declarations) {
      if (!d.initializer) continue
      const init = d.initializer
      const asserted =
        (ts.isSatisfiesExpression(init) || ts.isAsExpression(init)) && typeName(init.type) === 'CrudConfig'
      const annotated = typeName(d.type) === 'CrudConfig'
      const obj = unwrap(init)
      if (!ts.isObjectLiteralExpression(obj)) continue
      if (asserted || annotated) return obj
      if (!heuristic && get(sf, obj, 'list') && get(sf, obj, 'query')) heuristic = obj
    }
  }
  return heuristic
}

function propName(p: ts.ObjectLiteralElementLike): string | undefined {
  const n = p.name
  if (!n) return undefined
  if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) return n.text
  return undefined // computed
}

/**
 * Property lookup on an object literal, following `PropertyAssignment`s and
 * `ShorthandPropertyAssignment`s (resolved to same-file consts) and looking
 * inside spreads of same-file object literals. Anything else that could hide
 * the key (foreign spread, computed name) yields `'unknown'`.
 */
export function prop(sf: ts.SourceFile, obj: ts.ObjectLiteralExpression, key: string): Resolved {
  let opaque = false
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p)) {
      if (propName(p) === key) return p.initializer
      if (propName(p) === undefined) opaque = true
    } else if (ts.isShorthandPropertyAssignment(p)) {
      if (p.name.text === key) return resolveIdent(sf, key) ?? 'unknown'
    } else if (ts.isSpreadAssignment(p)) {
      const inner = deref(sf, p.expression)
      if (inner && inner !== 'unknown' && ts.isObjectLiteralExpression(inner)) {
        const r = prop(sf, inner, key)
        if (r) return r
      } else {
        opaque = true
      }
    } else if (ts.isMethodDeclaration(p) || ts.isGetAccessor(p)) {
      if (propName(p) === key) return 'unknown'
    }
  }
  return opaque ? 'unknown' : undefined
}

/** `get(sf, obj, 'dialogs.view.headerConfig')` — dotted path, each hop dereferenced. */
export function get(sf: ts.SourceFile, obj: ts.ObjectLiteralExpression, path: string): Resolved {
  let cur: Resolved = obj
  for (const key of path.split('.')) {
    cur = deref(sf, cur)
    if (!cur || cur === 'unknown') return cur
    if (!ts.isObjectLiteralExpression(cur)) return 'unknown'
    cur = prop(sf, cur, key)
  }
  return cur
}

export function isFalse(e: Resolved): boolean {
  return !!e && e !== 'unknown' && unwrap(e).kind === ts.SyntaxKind.FalseKeyword
}
export function isTrue(e: Resolved): boolean {
  return !!e && e !== 'unknown' && unwrap(e).kind === ts.SyntaxKind.TrueKeyword
}
export function stringValue(e: Resolved): string | undefined {
  if (!e || e === 'unknown') return undefined
  const u = unwrap(e)
  return ts.isStringLiteral(u) || ts.isNoSubstitutionTemplateLiteral(u) ? u.text : undefined
}
export function numberValue(e: Resolved): number | undefined {
  if (!e || e === 'unknown') return undefined
  const u = unwrap(e)
  return ts.isNumericLiteral(u) ? Number(u.text) : undefined
}

/** Elements of an array literal (after deref); `undefined` when not statically an array. */
export function arrayElements(sf: ts.SourceFile, e: Resolved): ts.Expression[] | undefined {
  const d = deref(sf, e)
  if (!d || d === 'unknown') return undefined
  return ts.isArrayLiteralExpression(d) ? d.elements.map(unwrap) : undefined
}

/** Named imports of `file` as `{ local -> module specifier }`. */
export function imports(sf: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>()
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue
    const spec = st.moduleSpecifier.text
    const clause = st.importClause
    if (!clause) continue
    if (clause.name) out.set(clause.name.text, spec)
    const nb = clause.namedBindings
    if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) out.set(el.name.text, spec)
    if (nb && ts.isNamespaceImport(nb)) out.set(nb.name.text, spec)
  }
  return out
}

function firstJsxTag(node: ts.Node): string | undefined {
  let found: string | undefined
  const visit = (n: ts.Node): void => {
    if (found) return
    if (ts.isJsxSelfClosingElement(n)) found = n.tagName.getText()
    else if (ts.isJsxOpeningElement(n)) found = n.tagName.getText()
    else ts.forEachChild(n, visit)
  }
  visit(node)
  return found
}

function resolveRelative(from: string, spec: string): string | undefined {
  // `@/x` → `<nearest src>/x` (the Next.js default alias); anything else relative to the importer.
  const srcIdx = from.lastIndexOf(`${sep}src${sep}`)
  const base = spec.startsWith('@/')
    ? srcIdx < 0
      ? undefined
      : join(from.slice(0, srcIdx + 4), spec.slice(2))
    : resolve(dirname(from), spec)
  if (!base) return undefined
  for (const cand of [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand
  }
  return undefined
}

/**
 * Component rendered by a `renderContent` arrow (`item => <XDetail .../>`):
 * the file that defines the JSX tag — the config file itself when the
 * component is a same-file function/const, or the imported (relative or
 * `@/`-aliased) `.tsx|.ts|/index.tsx`. `undefined` when it cannot be traced.
 */
export function resolveComponent(parsed: Parsed, expr: Resolved): Parsed | undefined {
  const d = deref(parsed.sf, expr)
  if (!d || d === 'unknown') return undefined
  const tag = firstJsxTag(d)
  if (!tag) return undefined
  const local = tag.split('.')[0]
  if (resolveIdent(parsed.sf, local)) return parsed
  for (const st of parsed.sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name?.text === local) return parsed
  }
  const spec = imports(parsed.sf).get(local)
  if (!spec || !(spec.startsWith('.') || spec.startsWith('@/'))) return undefined
  const file = resolveRelative(parsed.file, spec)
  return file ? parse(file) : undefined
}

/** Every `CallExpression` whose callee is the bare identifier `name`. */
export function callsTo(sf: ts.SourceFile, name: string): ts.CallExpression[] {
  const out: ts.CallExpression[] = []
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name) out.push(n)
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

/**
 * Largest array of `{ label, content }`-shaped object literals in the file —
 * the tab list of a ContentTabs/AdminTabs. ponytail: shape heuristic, not
 * type-based; good enough to count tabs.
 */
export function maxTabCount(sf: ts.SourceFile): number {
  let max = 0
  const visit = (n: ts.Node): void => {
    if (ts.isArrayLiteralExpression(n)) {
      const tabs = n.elements.filter(
        (e) =>
          ts.isObjectLiteralExpression(e) &&
          prop(sf, e, 'label') !== undefined &&
          (prop(sf, e, 'content') !== undefined || prop(sf, e, 'value') !== undefined)
      )
      if (tabs.length > max) max = tabs.length
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return max
}

// ---------------------------------------------------------------------------
// JSX helpers
// ---------------------------------------------------------------------------

/** The "tag node" of a JSX element: what carries `tagName` + `attributes`. */
export type JsxTag = ts.JsxOpeningElement | ts.JsxSelfClosingElement

export function jsxTags(sf: ts.SourceFile): JsxTag[] {
  const out: JsxTag[] = []
  const visit = (n: ts.Node): void => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) out.push(n)
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

export function jsxTagName(n: JsxTag): string {
  return n.tagName.getText()
}

/** Tag of the JSX element that directly contains `n` (as a child, not as an attribute). */
export function jsxParent(n: JsxTag): JsxTag | undefined {
  const el = ts.isJsxOpeningElement(n) ? n.parent : n
  return ts.isJsxElement(el.parent) ? el.parent.openingElement : undefined
}

export function jsxAttr(n: JsxTag, name: string): ts.JsxAttribute | undefined {
  for (const a of n.attributes.properties) {
    if (ts.isJsxAttribute(a) && ts.isIdentifier(a.name) && a.name.text === name) return a
  }
  return undefined
}

/** `attr="x"` or `attr={'x'}` → `'x'`; anything else (absent, expression) → `undefined`. */
export function jsxAttrString(n: JsxTag, name: string): string | undefined {
  const init = jsxAttr(n, name)?.initializer
  if (!init) return undefined
  if (ts.isStringLiteral(init)) return init.text
  if (ts.isJsxExpression(init) && init.expression) return stringValue(init.expression)
  return undefined
}

/** Leading literal text of `attr`: the string itself, or the head of a template (`{`mailto:${x}`}` → `'mailto:'`). */
export function jsxAttrHead(n: JsxTag, name: string): string | undefined {
  const init = jsxAttr(n, name)?.initializer
  if (init && ts.isJsxExpression(init) && init.expression && ts.isTemplateExpression(init.expression)) {
    return init.expression.head.text
  }
  return jsxAttrString(n, name)
}
