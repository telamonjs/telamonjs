'use client'

import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import type { CrudConfig } from '@telamonjs/ui'

interface Pedido {
  id: string
  descricao: string
}

// Literal pt-BR strings in title:/header: -- generated pre-i18n (or hand-edited without
// msg()). This module deliberately violates `i18n-literal-in-config`; it stays in the
// app-root that HAS i18n set up (../.. has messages/ + src/i18n/request.ts) so the rule
// fires here.
const columns: ColumnDef<Pedido>[] = [{ header: 'Descrição', accessorKey: 'descricao' }]

export const validationSchema = z.object({ descricao: z.string().min(1) })
export type PedidoFormData = z.infer<typeof validationSchema>

export const pedidosConfig: CrudConfig<Pedido, PedidoFormData> = {
  module: {
    name: 'pedidos',
    title: 'Detalhes dos Pedidos',
    description: 'Gerenciamento de pedidos',
    route: '/admin/pedidos'
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
        fields: [
          { name: 'descricao', label: 'Nome', type: 'text' },
          // FormField.label -- UI chrome, accented -> SHOULD be flagged.
          { name: 'endereco', label: 'Endereço', type: 'text' },
          // `loadField` returns IOption[] -- `label` here is domain data (the
          // option's display text), not chrome, even though it's accented and a
          // sibling `value:` sits right next to it -> should NOT be flagged.
          {
            name: 'clienteId',
            label: 'Cliente',
            type: 'relationship',
            loadField: async () => [
              { value: '1', label: 'José da Silva' },
              { value: '2', label: 'Endereço Comercial' }
            ]
          }
        ]
      }
    ],
    validation: validationSchema
  },

  query: {
    queryKey: ['pedidos'],
    queryFn: async () => ({ data: [], total: 0 })
  },

  mutations: {
    create: { mutationFn: async () => ({ success: true }), invalidates: [['pedidos']] },
    update: { mutationFn: async () => ({ success: true }), invalidates: [['pedidos']] },
    delete: { mutationFn: async () => ({ success: true }), invalidates: [['pedidos']] }
  }
}
