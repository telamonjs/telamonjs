import type { ComponentType } from 'react'
import { ptBR } from '../../i18n/messages/pt-BR'

/** A selectable item */
export interface SelectorItem {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }>
  groupId?: string
  disabled?: boolean
}

/** A group header for items */
export interface SelectorGroup {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }>
}

/** Labels for i18n - defaults are PT-BR */
export interface PopoverSelectorLabels {
  search: string
  noResults: string
  all: string
  selectAll: string
  clearAll: string
  selected: string
}

/**
 * Non-reactive PT-BR fallback (public export, pinned by the barrel snapshot).
 * The components themselves build translated defaults via `useTelamonjsT()` —
 * this constant only backs the `labels` prop when a caller wants a static
 * PT-BR value outside of React (or is not using the i18n provider).
 */
export const defaultLabels: PopoverSelectorLabels = {
  search: ptBR.telamonjs.common.search,
  noResults: ptBR.telamonjs.business.selector.noResults,
  all: ptBR.telamonjs.common.all,
  selectAll: ptBR.telamonjs.business.selector.selectAll,
  clearAll: ptBR.telamonjs.common.clear,
  selected: ptBR.telamonjs.business.selector.selectedWord,
}

/** Single select props */
export interface PopoverSelectorSingleProps {
  mode: 'single'
  items: SelectorItem[]
  groups?: SelectorGroup[]
  value: string | null
  onChange: (value: string | null) => void
  allLabel?: string
  placeholder?: string
  disabled?: boolean
  labels?: Partial<PopoverSelectorLabels>
  className?: string
  triggerClassName?: string
}

/** Multi select props */
export interface PopoverSelectorMultiProps {
  mode: 'multi'
  items: SelectorItem[]
  groups?: SelectorGroup[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  labels?: Partial<PopoverSelectorLabels>
  className?: string
  triggerClassName?: string
}

export type PopoverSelectorProps = PopoverSelectorSingleProps | PopoverSelectorMultiProps
