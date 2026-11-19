/**
 * Template for the REST API client (src/lib/api/<name>-client.ts).
 * Reference: packages/cli/templates/app/src/lib/api/usuarios-client.ts
 */
import { PrismaField } from '../utils/prisma-detector.js'
import { camelCase, capitalize } from '../utils/formatters.js'
import { fieldPropName, tsType } from '../utils/field-mapping.js'

export interface ApiClientOptions {
  name: string
  modelName: string
  fields: PrismaField[]
}

export function generateApiClient(options: ApiClientOptions): string {
  const { name, modelName, fields } = options
  const Entity = capitalize(modelName)
  const apiVar = `${camelCase(name)}Api`

  return `import type { PaginatedResponse, PaginationParams } from '@telamonjs/ui'
import type { ${Entity}FormData } from '@/app/admin/${name}/config'

export interface ${Entity} {
${fields.map(f => `  ${fieldPropName(f)}: ${tsType(f)}`).join('\n')}
}

const BASE_URL = '/api/${name}'

async function parse<T>(res: Response, errorMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? errorMessage)
  }
  return res.json()
}

export const ${apiVar} = {
  list: (params: PaginationParams): Promise<PaginatedResponse<${Entity}>> => {
    const query = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    })
    if (params.search) query.set('search', params.search)
    if (typeof params.sortBy === 'string' && params.sortBy) query.set('sortBy', params.sortBy)
    if (params.sortOrder) query.set('sortOrder', params.sortOrder)

    return fetch(\`\${BASE_URL}?\${query}\`, { credentials: 'include' }).then((res) =>
      parse(res, 'Erro ao carregar registros')
    )
  },
  getById: (id: string): Promise<${Entity}> =>
    fetch(\`\${BASE_URL}/\${id}\`, { credentials: 'include' }).then((res) =>
      parse(res, 'Registro não encontrado')
    ),
  create: (data: ${Entity}FormData): Promise<${Entity}> =>
    fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => parse(res, 'Erro ao criar registro')),
  update: (id: string, data: Partial<${Entity}FormData>): Promise<${Entity}> =>
    fetch(\`\${BASE_URL}/\${id}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }).then((res) => parse(res, 'Erro ao atualizar registro')),
  delete: (id: string): Promise<void> =>
    fetch(\`\${BASE_URL}/\${id}\`, { method: 'DELETE', credentials: 'include' }).then((res) => {
      if (!res.ok) throw new Error('Erro ao excluir registro')
    }),
}
`
}
