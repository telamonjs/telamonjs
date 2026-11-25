import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { createPaginatedResponse, sanitizePaginationParams } from '@telamonjs/data'
import { PrismaService } from '../../common/prisma/prisma.service'
import { parseParameterValue } from './parameter-value'
import { CreateParameterDto, UpdateParameterDto } from './dto/parameter.dto'

interface ListQuery {
  page?: string
  pageSize?: string
  search?: string
  group?: string
  sortBy?: string
  sortOrder?: string
}

const SORTABLE_FIELDS = new Set(['key', 'type', 'group', 'public', 'updatedAt'])

function assertParses(type: string, value: string) {
  try {
    parseParameterValue(type, value)
  } catch (error) {
    throw new BadRequestException(error instanceof Error ? error.message : 'Invalid value')
  }
}

/**
 * System parameters. Other modules import ParametersModule and read a value
 * with `get()`:
 *
 * @example
 * const maxUploadMb = await this.parameters.get('uploads.maxMb', 10)
 */
@Injectable()
export class ParametersService {
  constructor(private readonly prisma: PrismaService) {}

  /** A parameter's value, typed by its `type`, or `fallback` when missing or unparsable. */
  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.client.parameter.findUnique({ where: { key } })
    if (!row) return fallback
    try {
      return parseParameterValue(row.type, row.value) as T
    } catch {
      return fallback
    }
  }

  /** `{ key: value }` of the requested `public` parameters; the rest are absent. */
  async publicValues(keys: string[]) {
    const rows = await this.prisma.client.parameter.findMany({
      where: { key: { in: keys.slice(0, 100) }, public: true },
      select: { key: true, value: true, type: true },
    })
    const values: Record<string, unknown> = {}
    for (const row of rows) {
      try {
        values[row.key] = parseParameterValue(row.type, row.value)
      } catch {
        // unparsable: left out
      }
    }
    return values
  }

  async list(query: ListQuery) {
    const { page, pageSize } = sanitizePaginationParams({
      page: Number(query.page) || undefined,
      pageSize: Number(query.pageSize) || undefined,
    })
    const sortBy = query.sortBy && SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'key'
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc'
    const search = query.search || undefined
    const where = {
      ...(query.group && { group: query.group }),
      ...(search && {
        OR: [
          { key: { contains: search, mode: 'insensitive' as const } },
          { group: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const client = this.prisma.client
    const [data, total] = await Promise.all([
      client.parameter.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      client.parameter.count({ where }),
    ])
    return createPaginatedResponse(data, total, page, pageSize)
  }

  async getById(id: string) {
    const parameter = await this.prisma.client.parameter.findUnique({ where: { id } })
    if (!parameter) throw new NotFoundException('Parameter not found')
    return parameter
  }

  async create(dto: CreateParameterDto) {
    const type = dto.type ?? 'STRING'
    assertParses(type, dto.value)
    const client = this.prisma.client
    if (await client.parameter.findUnique({ where: { key: dto.key } })) {
      throw new ConflictException('This key is already in use')
    }
    return client.parameter.create({ data: { ...dto, type } })
  }

  async update(id: string, dto: UpdateParameterDto) {
    const found = await this.getById(id)
    // The value must still parse once type and value are merged with the row
    assertParses(dto.type ?? found.type, dto.value ?? found.value)
    const client = this.prisma.client
    if (dto.key && dto.key !== found.key) {
      if (await client.parameter.findUnique({ where: { key: dto.key } })) {
        throw new ConflictException('This key is already in use')
      }
    }
    return client.parameter.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.getById(id)
    await this.prisma.client.parameter.delete({ where: { id } })
  }
}
