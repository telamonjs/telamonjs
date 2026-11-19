import type { TelamonjsLocale } from '../locales'
import type { MessagesShape } from './shape'
import { ptBR } from './pt-BR'
import { en } from './en'
import { es } from './es'

/** Keys of pt-BR with string leaves: strict keys in `t()` for every locale (ICU args stay loose). */
export type TelamonjsMessages = MessagesShape<typeof ptBR>
export const telamonjsMessages: Record<TelamonjsLocale, TelamonjsMessages> = { 'pt-BR': ptBR, en, es }
