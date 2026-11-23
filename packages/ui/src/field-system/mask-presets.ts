/** Built-in masks for `maskType` (`_` = one digit). */
export type MaskPreset = 'tel' | 'cpf' | 'cnpj' | 'cep'

// 11 raw digits = mobile (9th digit). Decided by the raw digit count, never by
// the length of the formatted text (parens/space/dash shift it mid-keystroke).
const telMaskFor = (digitCount: number) =>
  digitCount > 10 ? '(__) _____-____' : '(__) ____-____'

// ponytail: digit-only, like MaskedInput itself — the alphanumeric CNPJ needs
// a letter slot in MaskedInput (digitsOf drops letters); add it there when a
// consumer needs it.
const MASK_PRESETS: Record<MaskPreset, (digitCount: number) => string> = {
  tel: telMaskFor,
  cpf: () => '___.___.___-__',
  cnpj: () => '__.___.___/____-__',
  cep: () => '_____-___',
}

export function isMaskPreset(maskType: unknown): maskType is MaskPreset {
  return typeof maskType === 'string' && Object.hasOwn(MASK_PRESETS, maskType)
}

/** Mask for `digitCount` raw digits: the `maskType` preset when there is one, else `mask`. */
export function resolveMask(
  maskType: string | undefined,
  mask: string | undefined,
  digitCount: number
): string {
  return isMaskPreset(maskType)
    ? MASK_PRESETS[maskType](digitCount)
    : mask || ''
}
