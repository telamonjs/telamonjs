import { z } from 'zod'

/**
 * Type for an async check function
 */
export type AsyncCheckFn<T = string> = (value: T) => Promise<boolean>

/**
 * Zod validator for unique CPF (checks whether it already exists)
 * See {@link uniqueEmail} for the i18n mechanism.
 * @param checkFn - Function returning true if the CPF already exists
 * @param message - Custom error message
 * @returns Zod schema with async validation
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   cpf: uniqueCPF(async (cpf) => {
 *     const cleaned = cpf.replace(/\D/g, '')
 *     const user = await prisma.user.findUnique({ where: { cpf: cleaned } })
 *     return !!user
 *   })
 * })
 * ```
 */
export const uniqueCPF = (checkFn: AsyncCheckFn<string>, message?: string) =>
  z.string().refine(
    async cpf => {
      const cleaned = cpf.replace(/\D/g, '')
      return !(await checkFn(cleaned))
    },
    message ? { message } : { params: { i18n: 'cpfTaken' } }
  )

/**
 * Zod validator for unique CNPJ (checks whether it already exists)
 * See {@link uniqueEmail} for the i18n mechanism.
 * @param checkFn - Function returning true if the CNPJ already exists
 * @param message - Custom error message
 * @returns Zod schema with async validation
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   cnpj: uniqueCNPJ(async (cnpj) => {
 *     const cleaned = cnpj.replace(/\D/g, '')
 *     const empresa = await prisma.empresa.findUnique({ where: { cnpj: cleaned } })
 *     return !!empresa
 *   })
 * })
 * ```
 */
export const uniqueCNPJ = (checkFn: AsyncCheckFn<string>, message?: string) =>
  z.string().refine(
    async cnpj => {
      const cleaned = cnpj.replace(/\D/g, '')
      return !(await checkFn(cleaned))
    },
    message ? { message } : { params: { i18n: 'cnpjTaken' } }
  )
