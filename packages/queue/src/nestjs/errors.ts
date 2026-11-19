import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { QueueHttpError } from '../http/index.js'

/** Maps a `QueueHttpError` (framework-agnostic) to the matching Nest `HttpException`. */
export function mapQueueHttpError(err: unknown): never {
  if (err instanceof QueueHttpError) {
    switch (err.status) {
      case 404:
        throw new NotFoundException(err.message)
      case 409:
        throw new ConflictException(err.message)
      case 422:
        throw new UnprocessableEntityException(err.message)
      default:
        throw new BadRequestException(err.message)
    }
  }
  throw err
}
