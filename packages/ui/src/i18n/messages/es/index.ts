import { common } from './common'
import { list } from './list'
import { pagination } from './pagination'
import { data } from './data'
import { form } from './form'
import { pickers } from './pickers'
import { validation } from './validation'
import { dialog } from './dialog'
import { toast } from './toast'
import { impersonation } from './impersonation'
import { shell } from './shell'
import { navigation } from './navigation'
import { detail } from './detail'
import { dashboard } from './dashboard'
import { queue } from './queue'
import { business } from './business'
import type { MessagesShape } from '../shape'
import type { ptBR } from '../pt-BR'

export const es = {
  telamonjs: {
    common,
    list,
    pagination,
    data,
    form,
    pickers,
    validation,
    dialog,
    toast,
    impersonation,
    shell,
    navigation,
    detail,
    dashboard,
    queue,
    business,
  },
} satisfies MessagesShape<typeof ptBR>
