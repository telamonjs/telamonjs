'use client'

import { z } from 'zod'
import type { CrudColumnDef, CrudConfig } from '@telamonjs/ui'
import { msg } from '@telamonjs/ui/i18n'

interface Produto {
  id: string
  nome: string
}

const columns: CrudColumnDef<Produto>[] = [{ header: msg('produtos.fields.nome'), accessorKey: 'nome' }]

export const validationSchema = z.object({ nome: z.string().min(1) })
export type ProdutoFormData = z.infer<typeof validationSchema>

export const produtosConfig: CrudConfig<Produto, ProdutoFormData> = {
  module: {
    name: 'produtos',
    title: msg('produtos.title'),
    description: msg('produtos.description'),
    route: '/admin/produtos'
  },

  list: {
    title: '',
    description: '',
    searchPlaceholder: 'Buscar...',
    columns,
    defaultPageSize: 100
  },

  form: {
    sections: [
      {
        label: 'Dados',
        grid: '2',
        fields: [{ name: 'nome', label: msg('produtos.fields.nome'), type: 'text' }]
      }
    ],
    validation: validationSchema
  },

  query: {
    queryKey: ['produtos'],
    queryFn: async () => ({ data: [], total: 0 })
  },

  mutations: {
    create: { mutationFn: async () => ({ success: true }), invalidates: [['produtos']] },
    update: { mutationFn: async () => ({ success: true }), invalidates: [['produtos']] },
    delete: { mutationFn: async () => ({ success: true }), invalidates: [['produtos']] }
  }
}
