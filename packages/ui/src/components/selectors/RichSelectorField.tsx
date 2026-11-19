'use client'

import { useEffect, useRef, type Ref } from 'react'
import { useWatch } from 'react-hook-form'
import {
  RichSelector,
  type RichSelectorCommonProps,
  type RichSelectorItem,
  type RichSelectorLoadContext,
  type RichSelectorLocalSource,
  type RichSelectorProps,
  type RichSelectorRemoteSource,
  type RichSelectorValue,
} from './RichSelector'

/** Props the form injects into a `type: 'component'` field. */
export interface RichSelectorFieldInjectedProps {
  /** The form Label points at the field name, so `name` wins over this. */
  id?: string
  name?: string
  label?: unknown
  placeholder?: string
  /** `focus: true` in the field config. */
  focus?: boolean
  value?: unknown
  onChange?: (value: unknown) => void
  onBlur?: () => void
  ref?: Ref<HTMLButtonElement>
  /** AdminForm's error state; BaseForm sends `aria-invalid`. */
  hasError?: boolean
  readOnly?: boolean
  disabled?: boolean
  required?: boolean
}

export type RichSelectorFieldLoadContext<V extends RichSelectorValue> =
  RichSelectorLoadContext<V> & {
    /** Current values of the `dependsOn` fields, by field name. */
    deps: Record<string, unknown>
  }

type RemoteFieldSource<V extends RichSelectorValue> = Omit<
  RichSelectorRemoteSource<V>,
  'load'
> & {
  load: (
    search: string,
    context: RichSelectorFieldLoadContext<V>
  ) => Promise<RichSelectorItem<V>[]>
}

export type RichSelectorFieldProps<V extends RichSelectorValue = string> =
  RichSelectorFieldInjectedProps &
    Omit<
      RichSelectorCommonProps<V>,
      'id' | 'disabled' | 'readOnly' | 'required' | 'autoFocus' | 'triggerRef' | 'onBlur'
    > &
    (RemoteFieldSource<V> | RichSelectorLocalSource<V>) & {
      multiple?: boolean
      maxSelected?: number
      /** Type the form stores. Default: the type of the option's `value`. */
      valueType?: 'string' | 'number'
      /** Form fields this list depends on; they join the `queryKey` and reach `load`. */
      dependsOn?: string | string[]
      /** Stay disabled until every `dependsOn` field has a value. */
      requireDeps?: boolean
      /** Clear when a `dependsOn` value changes to another (not on the first fill). */
      clearOnDepsChange?: boolean
      /** The picked records, to fill other fields: a form's `onChange` only keeps the value. */
      onItemsChange?: (items: RichSelectorItem<V>[]) => void
    }

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === ''

/** Accepts what forms keep (string, number, '', null); drops what can't be an id. */
const asId = (value: unknown): RichSelectorValue | null =>
  typeof value === 'string' || typeof value === 'number'
    ? value === ''
      ? null
      : value
    : null

function FieldBase<V extends RichSelectorValue>({
  value,
  onChange,
  valueType,
  multiple,
  deps,
  queryKey,
  load,
  items,
  filter,
  debounceMs,
  minSearchLength,
  staleTime,
  lazy,
  selectedItems,
  maxSelected,
  onItemsChange,
  // Dropped: `{...field}` also carries config the selector does not take.
  dependsOn: _dependsOn,
  requireDeps: _requireDeps,
  clearOnDepsChange: _clearOnDepsChange,
  ...rest
}: RichSelectorFieldProps<V> & { deps: Record<string, unknown> }) {
  const output = (id: V | null) =>
    id === null
      ? null
      : valueType === 'string'
        ? String(id)
        : valueType === 'number'
          ? Number(id)
          : id

  const source = (
    load
      ? {
          queryKey: [...(queryKey ?? []), deps],
          load: (search: string, context: RichSelectorLoadContext<V>) =>
            load(search, { ...context, deps }),
          debounceMs,
          minSearchLength,
          staleTime,
          lazy,
          selectedItems,
        }
      : { items, filter }
  ) as RichSelectorRemoteSource<V> | RichSelectorLocalSource<V>

  const selection =
    multiple
      ? {
          multiple: true,
          maxSelected,
          value: Array.isArray(value)
            ? value.map(asId).filter(id => id !== null)
            : [],
          onChange: (ids: V[], picked: RichSelectorItem<V>[]) => {
            onChange?.(ids.map(output))
            onItemsChange?.(picked)
          },
        }
      : {
          value: asId(value),
          onChange: (id: V | null, picked: RichSelectorItem<V> | null) => {
            onChange?.(output(id))
            onItemsChange?.(picked ? [picked] : [])
          },
        }

  const selector = {
    ...pickCommon(rest),
    ...source,
    ...selection,
  } as RichSelectorProps<V>

  return <RichSelector<V> {...selector} />
}

/** `{...field}` brings name, label, type, Component... Only these reach the selector. */
function pickCommon<V extends RichSelectorValue>(
  props: Omit<RichSelectorCommonProps<V>, 'autoFocus' | 'triggerRef'> &
    RichSelectorFieldInjectedProps
) {
  const {
    id,
    name,
    label,
    placeholder,
    focus,
    ref,
    hasError,
    onBlur,
    readOnly,
    disabled,
    required,
    icon,
    mono,
    labels,
    clearable,
    // A form is typed in: hovering over a field must not grab the caret.
    openOnHover = false,
    searchable,
    closeOnSelect,
    onOpenChange,
    renderItem,
    renderValue,
    footer,
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    className,
    contentClassName,
    align,
    side,
  } = props
  return {
    id: name || id || undefined,
    autoFocus: focus,
    triggerRef: ref,
    onBlur,
    readOnly,
    disabled,
    required,
    icon,
    mono,
    labels: placeholder ? { placeholder, ...labels } : labels,
    clearable,
    openOnHover,
    searchable,
    closeOnSelect,
    onOpenChange,
    renderItem,
    renderValue,
    footer,
    'aria-label': ariaLabel ?? (typeof label === 'string' ? label : undefined),
    'aria-invalid': ariaInvalid ?? (hasError || undefined),
    'aria-describedby': ariaDescribedBy,
    className,
    contentClassName,
    align,
    side,
  }
}

const NO_DEPS: Record<string, unknown> = {}

// Separate component: useWatch needs a form, and without `dependsOn` the field
// also works outside one.
function WatchingField<V extends RichSelectorValue>(
  props: RichSelectorFieldProps<V> & { dependsOn: string | string[] }
) {
  const { dependsOn, requireDeps, clearOnDepsChange, onChange, value, disabled } =
    props
  const names = Array.isArray(dependsOn) ? dependsOn : [dependsOn]
  const watched = useWatch({ name: names }) as unknown[]
  const deps = Object.fromEntries(names.map((name, i) => [name, watched[i]]))
  const signature = JSON.stringify(watched)

  const previous = useRef(watched)
  useEffect(() => {
    const before = previous.current
    previous.current = watched
    if (!clearOnDepsChange) return
    // Empty → value is the form being filled (edit mode): keep the selection.
    const changed = names.some(
      (_, i) => !isEmpty(before[i]) && before[i] !== watched[i]
    )
    if (changed && !isEmpty(value)) onChange?.(props.multiple ? [] : null)
    // Runs on dependency changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return (
    <FieldBase<V>
      {...props}
      deps={deps}
      disabled={disabled || (requireDeps && watched.some(isEmpty))}
    />
  )
}

/**
 * `RichSelector` for a form: `{ type: 'component', Component: ClientField }`,
 * where `ClientField` is a module-level component that renders this with the
 * props it received. Never an inline arrow in the config: it would remount on
 * every render. Guide: apps/docs/content/docs/components/rich-selector.mdx
 */
export function RichSelectorField<V extends RichSelectorValue = string>(
  props: RichSelectorFieldProps<V>
) {
  return props.dependsOn ? (
    <WatchingField<V> {...props} dependsOn={props.dependsOn} />
  ) : (
    <FieldBase<V> {...props} deps={NO_DEPS} />
  )
}
