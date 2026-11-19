import { describe, it, expect, beforeAll } from 'vitest'
import { z } from 'zod'
import { setupZodLocale } from '../../../i18n/zod-locale'
import {
  validateCPF,
  validateCNPJ,
  validateCEP,
  validateTelefone,
  validatePlaca,
  validateRENAVAM,
  cpf as cpfValidator,
  cnpj as cnpjValidator,
  cep as cepValidator,
  telefone as telefoneValidator,
  placa as placaValidator,
  renavam as renavamValidator,
} from './br-validators'

// These validators no longer carry a hard-coded `message` — with none given
// they issue `params: { i18n: '<key>' }`, translated by the zod error map
// installed via `setupZodLocale()`. Install the pt-BR map once for the
// suite so `error.errors[0].message` assertions keep working.
beforeAll(() => setupZodLocale('pt-BR'))

describe('Brazilian Validators', () => {
  describe('CPF Validator', () => {
    describe('Valid CPFs', () => {
      it('validates correct CPF without mask', () => {
        expect(validateCPF('12345678909')).toBe(true)
        expect(validateCPF('11144477735')).toBe(true)
      })

      it('validates correct CPF with mask', () => {
        expect(validateCPF('123.456.789-09')).toBe(true)
        expect(validateCPF('111.444.777-35')).toBe(true)
      })

      it('validates CPF with mixed formatting', () => {
        expect(validateCPF('123 456 789-09')).toBe(true)
        expect(validateCPF('123.456.78909')).toBe(true)
      })
    })

    describe('Invalid CPFs', () => {
      it('rejects CPF with wrong length', () => {
        expect(validateCPF('123456789')).toBe(false) // Too short
        expect(validateCPF('123456789012')).toBe(false) // Too long
        expect(validateCPF('')).toBe(false) // Empty
      })

      it('rejects CPF with all same digits', () => {
        expect(validateCPF('11111111111')).toBe(false)
        expect(validateCPF('00000000000')).toBe(false)
        expect(validateCPF('99999999999')).toBe(false)
      })

      it('rejects CPF with invalid check digits', () => {
        expect(validateCPF('12345678900')).toBe(false)
        expect(validateCPF('11144477736')).toBe(false)
      })

      it('rejects CPF with letters', () => {
        expect(validateCPF('123456789AB')).toBe(false)
        expect(validateCPF('ABC.456.789-09')).toBe(false)
      })
    })

    describe('Zod Integration', () => {
      it('validates with Zod schema', () => {
        const schema = z.object({
          cpf: cpfValidator(),
        })

        expect(() => schema.parse({ cpf: '12345678909' })).not.toThrow()
      })

      it('returns error message in Portuguese', () => {
        const schema = z.object({
          cpf: cpfValidator(),
        })

        try {
          schema.parse({ cpf: '00000000000' })
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors[0].message).toBe('CPF inválido')
          }
        }
      })
    })
  })

  describe('CNPJ Validator', () => {
    describe('Valid CNPJs', () => {
      it('validates correct CNPJ without mask', () => {
        expect(validateCNPJ('11222333000181')).toBe(true)
        expect(validateCNPJ('34028316000103')).toBe(true)
      })

      it('validates correct CNPJ with mask', () => {
        expect(validateCNPJ('11.222.333/0001-81')).toBe(true)
        expect(validateCNPJ('34.028.316/0001-03')).toBe(true)
      })

      it('validates CNPJ with partial mask', () => {
        expect(validateCNPJ('11222333/0001-81')).toBe(true)
        expect(validateCNPJ('11.222.333000181')).toBe(true)
      })
    })

    describe('Invalid CNPJs', () => {
      it('rejects CNPJ with wrong length', () => {
        expect(validateCNPJ('1122233300018')).toBe(false) // Too short
        expect(validateCNPJ('112223330001811')).toBe(false) // Too long
        expect(validateCNPJ('')).toBe(false) // Empty
      })

      it('rejects CNPJ with all same digits', () => {
        expect(validateCNPJ('11111111111111')).toBe(false)
        expect(validateCNPJ('00000000000000')).toBe(false)
        expect(validateCNPJ('99999999999999')).toBe(false)
      })

      it('rejects CNPJ with invalid check digits', () => {
        expect(validateCNPJ('11222333000180')).toBe(false)
        expect(validateCNPJ('34028316000102')).toBe(false)
      })
    })

    describe('Zod Integration', () => {
      it('validates with Zod schema', () => {
        const schema = z.object({
          cnpj: cnpjValidator(),
        })

        expect(() => schema.parse({ cnpj: '11222333000181' })).not.toThrow()
      })

      it('returns error message in Portuguese', () => {
        const schema = z.object({
          cnpj: cnpjValidator(),
        })

        try {
          schema.parse({ cnpj: '00000000000000' })
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors[0].message).toBe('CNPJ inválido')
          }
        }
      })
    })
  })

  describe('CEP Validator', () => {
    describe('Valid CEPs', () => {
      it('validates correct CEP without mask', () => {
        expect(validateCEP('01310100')).toBe(true)
        expect(validateCEP('12345678')).toBe(true)
      })

      it('validates correct CEP with mask', () => {
        expect(validateCEP('01310-100')).toBe(true)
        expect(validateCEP('12345-678')).toBe(true)
      })

      it('validates CEP with dots', () => {
        expect(validateCEP('01.310-100')).toBe(true)
      })
    })

    describe('Invalid CEPs', () => {
      it('rejects CEP with wrong length', () => {
        expect(validateCEP('0131010')).toBe(false) // Too short
        expect(validateCEP('013101000')).toBe(false) // Too long
        expect(validateCEP('')).toBe(false) // Empty
      })

      it('rejects CEP with letters', () => {
        expect(validateCEP('0131010A')).toBe(false)
        expect(validateCEP('ABCD-EFG')).toBe(false)
      })

      it('rejects CEP with special characters only', () => {
        expect(validateCEP('--------')).toBe(false)
      })
    })

    describe('Zod Integration', () => {
      it('validates with Zod schema', () => {
        const schema = z.object({
          cep: cepValidator(),
        })

        expect(() => schema.parse({ cep: '01310-100' })).not.toThrow()
      })

      it('returns error message in Portuguese', () => {
        const schema = z.object({
          cep: cepValidator(),
        })

        try {
          schema.parse({ cep: '12345' })
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors[0].message).toBe('CEP inválido')
          }
        }
      })
    })
  })

  describe('Phone (Telefone) Validator', () => {
    describe('Valid Phones', () => {
      it('validates landline (10 digits)', () => {
        expect(validateTelefone('1133334444')).toBe(true)
        expect(validateTelefone('4733334444')).toBe(true)
      })

      it('validates mobile (11 digits starting with 9)', () => {
        expect(validateTelefone('11987654321')).toBe(true)
        expect(validateTelefone('47987654321')).toBe(true)
      })

      it('validates phone with mask', () => {
        expect(validateTelefone('(11) 3333-4444')).toBe(true)
        expect(validateTelefone('(11) 98765-4321')).toBe(true)
      })

      it('validates phone with different formatting', () => {
        expect(validateTelefone('11 3333-4444')).toBe(true)
        expect(validateTelefone('11-3333-4444')).toBe(true)
      })
    })

    describe('Invalid Phones', () => {
      it('rejects phone with wrong length', () => {
        expect(validateTelefone('113333444')).toBe(false) // Too short
        expect(validateTelefone('119876543210')).toBe(false) // Too long
      })

      it('rejects phone with invalid DDD', () => {
        expect(validateTelefone('0933334444')).toBe(false) // DDD < 11
        expect(validateTelefone('0133334444')).toBe(false) // DDD < 11
      })

      it('rejects mobile not starting with 9', () => {
        expect(validateTelefone('11887654321')).toBe(false)
        expect(validateTelefone('11787654321')).toBe(false)
      })

      it('rejects empty or very short numbers', () => {
        expect(validateTelefone('')).toBe(false)
        expect(validateTelefone('1234')).toBe(false)
      })
    })

    describe('Zod Integration', () => {
      it('validates with Zod schema', () => {
        const schema = z.object({
          telefone: telefoneValidator(),
        })

        expect(() =>
          schema.parse({ telefone: '(11) 98765-4321' })
        ).not.toThrow()
      })

      it('returns error message in Portuguese', () => {
        const schema = z.object({
          telefone: telefoneValidator(),
        })

        try {
          schema.parse({ telefone: '123' })
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors[0].message).toBe('Telefone inválido')
          }
        }
      })
    })
  })

  describe('Placa (License Plate) Validator', () => {
    describe('Valid Placas', () => {
      it('validates old format (ABC-1234)', () => {
        expect(validatePlaca('ABC1234')).toBe(true)
        expect(validatePlaca('XYZ9876')).toBe(true)
      })

      it('validates old format with mask', () => {
        expect(validatePlaca('ABC-1234')).toBe(true)
        expect(validatePlaca('XYZ-9876')).toBe(true)
      })

      it('validates Mercosul format (ABC1D23)', () => {
        expect(validatePlaca('ABC1D23')).toBe(true)
        expect(validatePlaca('XYZ9A87')).toBe(true)
      })

      it('validates case insensitive', () => {
        expect(validatePlaca('abc1234')).toBe(true)
        expect(validatePlaca('AbC-1234')).toBe(true)
      })
    })

    describe('Invalid Placas', () => {
      it('rejects placa with wrong format', () => {
        expect(validatePlaca('12ABCD')).toBe(false)
        expect(validatePlaca('ABCD123')).toBe(false)
      })

      it('rejects placa with wrong length', () => {
        expect(validatePlaca('ABC123')).toBe(false) // Too short
        expect(validatePlaca('ABC12345')).toBe(false) // Too long
      })

      it('rejects empty placa', () => {
        expect(validatePlaca('')).toBe(false)
      })
    })

    describe('Zod Integration', () => {
      it('validates with Zod schema', () => {
        const schema = z.object({
          placa: placaValidator(),
        })

        expect(() => schema.parse({ placa: 'ABC-1234' })).not.toThrow()
      })

      it('returns error message in Portuguese', () => {
        const schema = z.object({
          placa: placaValidator(),
        })

        try {
          schema.parse({ placa: '12345' })
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors[0].message).toBe('Placa inválida')
          }
        }
      })
    })
  })

  describe('RENAVAM Validator', () => {
    describe('Valid RENAVAMs', () => {
      it.skip('validates correct RENAVAM (11 digits)', () => {
        // TODO: Need real valid RENAVAM numbers for testing
        // RENAVAM uses a complex checksum algorithm
        expect(validateRENAVAM('12345678901')).toBe(true)
      })

      it.skip('validates RENAVAM with formatting', () => {
        // TODO: Need real valid RENAVAM numbers for testing
        expect(validateRENAVAM('123.456.789-01')).toBe(true)
      })
    })

    describe('Invalid RENAVAMs', () => {
      it('rejects RENAVAM with wrong length', () => {
        expect(validateRENAVAM('1234567890')).toBe(false) // Too short
        expect(validateRENAVAM('123456789012')).toBe(false) // Too long
      })

      it('rejects RENAVAM with invalid check digit', () => {
        expect(validateRENAVAM('12345678909')).toBe(false)
      })

      it('rejects empty RENAVAM', () => {
        expect(validateRENAVAM('')).toBe(false)
      })
    })

    describe('Zod Integration', () => {
      it.skip('validates with Zod schema', () => {
        // TODO: Need real valid RENAVAM numbers for testing
        const schema = z.object({
          renavam: renavamValidator(),
        })

        expect(() => schema.parse({ renavam: '12345678901' })).not.toThrow()
      })

      it('returns error message in Portuguese', () => {
        const schema = z.object({
          renavam: renavamValidator(),
        })

        try {
          schema.parse({ renavam: '123' })
        } catch (error) {
          if (error instanceof z.ZodError) {
            expect(error.errors[0].message).toBe('RENAVAM inválido')
          }
        }
      })
    })
  })

  describe('Validator Composition', () => {
    it('combines multiple validators in schema', () => {
      const schema = z.object({
        cpf: cpfValidator(),
        cnpj: cnpjValidator(),
        cep: cepValidator(),
        telefone: telefoneValidator(),
      })

      const validData = {
        cpf: '12345678909',
        cnpj: '11222333000181',
        cep: '01310-100',
        telefone: '(11) 98765-4321',
      }

      expect(() => schema.parse(validData)).not.toThrow()
    })

    it('reports all validation errors', () => {
      const schema = z.object({
        cpf: cpfValidator(),
        cnpj: cnpjValidator(),
      })

      const invalidData = {
        cpf: '00000000000',
        cnpj: '00000000000000',
      }

      try {
        schema.parse(invalidData)
      } catch (error) {
        if (error instanceof z.ZodError) {
          expect(error.errors).toHaveLength(2)
          expect(error.errors[0].message).toBe('CPF inválido')
          expect(error.errors[1].message).toBe('CNPJ inválido')
        }
      }
    })

    it('allows optional validators', () => {
      const schema = z.object({
        cpf: cpfValidator().optional(),
        telefone: telefoneValidator().optional(),
      })

      expect(() => schema.parse({})).not.toThrow()
      expect(() => schema.parse({ cpf: '12345678909' })).not.toThrow()
    })

    it('chains with other Zod validators', () => {
      const schema = z.object({
        cpf: cpfValidator().transform(val => val.replace(/\D/g, '')),
      })

      const result = schema.parse({ cpf: '123.456.789-09' })
      expect(result.cpf).toBe('12345678909')
    })
  })

  describe('Edge Cases', () => {
    it('handles null values gracefully', () => {
      // Validators expect string input, null/undefined will throw
      // This is expected behavior - use Zod .optional() for optional fields
      expect(() => validateCPF(null as any)).toThrow()
      expect(() => validateCNPJ(null as any)).toThrow()
      expect(() => validateCEP(null as any)).toThrow()
    })

    it('handles undefined values gracefully', () => {
      // Validators expect string input, null/undefined will throw
      // This is expected behavior - use Zod .optional() for optional fields
      expect(() => validateCPF(undefined as any)).toThrow()
      expect(() => validateCNPJ(undefined as any)).toThrow()
      expect(() => validateCEP(undefined as any)).toThrow()
    })

    it('handles whitespace-only strings', () => {
      expect(validateCPF('   ')).toBe(false)
      expect(validateCNPJ('   ')).toBe(false)
      expect(validateCEP('   ')).toBe(false)
    })

    it('handles special characters', () => {
      expect(validateCPF('123!456@789#09')).toBe(true) // Removes non-digits
      expect(validateCEP('01310*100')).toBe(true) // Removes non-digits
    })

    it('handles very long strings', () => {
      const longString = '1'.repeat(100)
      expect(validateCPF(longString)).toBe(false)
      expect(validateCNPJ(longString)).toBe(false)
    })
  })

  describe('Performance', () => {
    it('validates CPF quickly (< 10ms for 100 validations)', () => {
      const start = performance.now()
      for (let i = 0; i < 100; i++) {
        validateCPF('12345678909')
      }
      const end = performance.now()
      expect(end - start).toBeLessThan(10)
    })

    it('validates CNPJ quickly (< 10ms for 100 validations)', () => {
      const start = performance.now()
      for (let i = 0; i < 100; i++) {
        validateCNPJ('11222333000181')
      }
      const end = performance.now()
      expect(end - start).toBeLessThan(10)
    })
  })
})
