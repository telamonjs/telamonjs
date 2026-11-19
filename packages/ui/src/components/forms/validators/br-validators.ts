import { z } from 'zod'

/**
 * Validates a Brazilian CPF
 * @param cpf - CPF with or without mask
 * @returns true if valid
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')

  if (cleaned.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleaned)) return false // All digits identical

  let sum = 0
  let remainder: number

  // Validate first check digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false

  sum = 0
  // Validate second check digit
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false

  return true
}

/**
 * Validates a Brazilian CNPJ
 * @param cnpj - CNPJ with or without mask
 * @returns true if valid
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')

  if (cleaned.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleaned)) return false // All digits identical

  let length = cleaned.length - 2
  let numbers = cleaned.substring(0, length)
  const digits = cleaned.substring(length)
  let sum = 0
  let pos = length - 7

  // Validate first check digit
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  length = length + 1
  numbers = cleaned.substring(0, length)
  sum = 0
  pos = length - 7

  // Validate second check digit
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false

  return true
}

/**
 * Validates the Brazilian CEP format
 * @param cep - CEP with or without mask
 * @returns true if valid
 */
export function validateCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '')
  return cleaned.length === 8 && /^\d{8}$/.test(cleaned)
}

/**
 * Validates a Brazilian phone number (landline or mobile)
 * @param telefone - Phone number with or without mask
 * @returns true if valid
 */
export function validateTelefone(telefone: string): boolean {
  const cleaned = telefone.replace(/\D/g, '')

  // (00) 0000-0000 or (00) 00000-0000
  if (cleaned.length === 10 || cleaned.length === 11) {
    // Check for a valid DDD area code (11-99)
    const ddd = parseInt(cleaned.substring(0, 2))
    if (ddd < 11 || ddd > 99) return false

    // If mobile (11 digits), check that it starts with 9
    if (cleaned.length === 11 && cleaned.charAt(2) !== '9') return false

    return true
  }

  return false
}

/**
 * Validates a Brazilian vehicle license plate (old or Mercosul format)
 * @param placa - Plate with or without mask
 * @returns true if valid
 */
export function validatePlaca(placa: string): boolean {
  const cleaned = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase()

  // Old plate: ABC-1234 (3 letters + 4 digits)
  const placaAntiga = /^[A-Z]{3}\d{4}$/
  // Mercosul plate: ABC1D23 (3 letters + 1 digit + 1 letter + 2 digits)
  const placaMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/

  return placaAntiga.test(cleaned) || placaMercosul.test(cleaned)
}

/**
 * Validates a Brazilian RENAVAM
 * @param renavam - RENAVAM with or without mask
 * @returns true if valid
 */
export function validateRENAVAM(renavam: string): boolean {
  const cleaned = renavam.replace(/\D/g, '')

  if (cleaned.length !== 11) return false

  // Check digit
  const sequencia = '3298765432'
  const digitos = cleaned.substring(0, 10)
  let soma = 0

  for (let i = 0; i < 10; i++) {
    soma += parseInt(digitos.charAt(i)) * parseInt(sequencia.charAt(i))
  }

  const mod11 = soma % 11
  const dv = mod11 === 0 || mod11 === 1 ? 0 : 11 - mod11

  return dv === parseInt(cleaned.charAt(10))
}

// ============================================================================
// ZOD VALIDATORS
// ============================================================================

/**
 * Zod validator for CPF
 *
 * With no `message`, the issue carries `params: { i18n: 'invalidCpf' }` —
 * translated by the error map installed via `setupZodLocale()`
 * (`telamonjs.validation.invalidCpf`). Pass `message` to override.
 */
export const cpf = (message?: string) =>
  z
    .string()
    .refine(
      value => validateCPF(value),
      message ? { message } : { params: { i18n: 'invalidCpf' } }
    )

/**
 * Zod validator for CNPJ — see {@link cpf} for the i18n mechanism.
 */
export const cnpj = (message?: string) =>
  z
    .string()
    .refine(
      value => validateCNPJ(value),
      message ? { message } : { params: { i18n: 'invalidCnpj' } }
    )

/**
 * Zod validator for CEP — see {@link cpf} for the i18n mechanism.
 */
export const cep = (message?: string) =>
  z
    .string()
    .refine(
      value => validateCEP(value),
      message ? { message } : { params: { i18n: 'invalidCep' } }
    )

/**
 * Zod validator for phone number — see {@link cpf} for the i18n mechanism.
 */
export const telefone = (message?: string) =>
  z
    .string()
    .refine(
      value => validateTelefone(value),
      message ? { message } : { params: { i18n: 'invalidPhone' } }
    )

/**
 * Zod validator for a vehicle license plate — see {@link cpf} for the i18n mechanism.
 */
export const placa = (message?: string) =>
  z
    .string()
    .refine(
      value => validatePlaca(value),
      message ? { message } : { params: { i18n: 'invalidPlate' } }
    )

/**
 * Zod validator for RENAVAM — see {@link cpf} for the i18n mechanism.
 */
export const renavam = (message?: string) =>
  z
    .string()
    .refine(
      value => validateRENAVAM(value),
      message ? { message } : { params: { i18n: 'invalidRenavam' } }
    )
