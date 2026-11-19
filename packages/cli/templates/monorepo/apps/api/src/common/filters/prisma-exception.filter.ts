import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common'
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library'

/**
 * Translates Prisma errors into the appropriate HTTP response:
 * - P2002 (unique)          -> 409 Conflict
 * - P2003 (FK)              -> 400 Bad Request
 * - P2025 (not found)       -> 404 Not Found
 * - P2011/P2012 (required/check) -> 400 Bad Request
 * - P2014 (FK on delete)    -> 400 Bad Request
 * - P1000-P1003 (connection) -> 503 Service Unavailable
 * - validation/unknown      -> 400/500
 */
@Catch(PrismaClientKnownRequestError, PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError | PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()
    const timestamp = new Date().toISOString()

    if (exception instanceof PrismaClientValidationError) {
      return response.status(400).json({
        statusCode: 400,
        message: 'Dados inválidos',
        error: 'Bad Request',
        timestamp,
        path: request.url,
      })
    }

    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[]) || []
        return response.status(409).json({
          statusCode: 409,
          message: `Registro duplicado: ${target.join(', ')} já existe`,
          error: 'Conflict',
          field: target[0],
          timestamp,
          path: request.url,
        })
      }
      case 'P2003': {
        const fieldName = exception.meta?.field_name as string
        return response.status(400).json({
          statusCode: 400,
          message: `Referência inválida: ${fieldName || 'relacionamento'} não existe`,
          error: 'Bad Request',
          field: fieldName,
          timestamp,
          path: request.url,
        })
      }
      case 'P2025':
        return response.status(404).json({
          statusCode: 404,
          message: 'Registro não encontrado',
          error: 'Not Found',
          timestamp,
          path: request.url,
        })
      case 'P2011':
      case 'P2012':
        return response.status(400).json({
          statusCode: 400,
          message: 'Dados inválidos: restrição obrigatória/check violada',
          error: 'Bad Request',
          timestamp,
          path: request.url,
        })
      case 'P2014':
        return response.status(400).json({
          statusCode: 400,
          message: 'Não é possível excluir: registro referenciado por outros registros',
          error: 'Bad Request',
          timestamp,
          path: request.url,
        })
      case 'P1000':
      case 'P1001':
      case 'P1002':
      case 'P1003':
        return response.status(503).json({
          statusCode: 503,
          message: 'Erro de conexão com o banco',
          error: 'Service Unavailable',
          timestamp,
          path: request.url,
        })
      default:
        console.error('[PrismaError]', exception.code, exception.message)
        return response.status(500).json({
          statusCode: 500,
          message: 'Erro interno',
          error: 'Internal Server Error',
          timestamp,
          path: request.url,
        })
    }
  }
}
