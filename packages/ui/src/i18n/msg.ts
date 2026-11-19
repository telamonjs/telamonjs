/** Reference to a translatable message, for config objects that cannot call hooks. */
export interface MessageRef {
  readonly key: string
  readonly values?: Readonly<Record<string, string | number | Date>>
  /**
   * Serializable brand. `msg()` brands with a Symbol, which is dropped when a
   * config crosses the server → client props boundary; write
   * `{ key: 'menu.alunos', $msg: true }` for config built in a Server
   * Component and handed to a Client one.
   */
  readonly $msg?: true
}

/** A UI text slot: a literal (rendered as-is) or a MessageRef (resolved by useText()). */
export type I18nText = string | MessageRef

const REF = Symbol.for('telamonjs.msg')

/** `msg('users.title')` — marks a config text as a message key resolved in the active locale. */
export function msg(key: string, values?: MessageRef['values']): MessageRef {
  const ref: MessageRef = values ? { key, values } : { key }
  // Non-enumerable brand: `toEqual` ignores it and arbitrary `{ key }` objects are not refs.
  Object.defineProperty(ref, REF, { value: true, enumerable: false })
  return ref
}

export function isMessageRef(v: unknown): v is MessageRef {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<PropertyKey, unknown>
  return o[REF] === true || (o.$msg === true && typeof o.key === 'string')
}
