// Task 5 scope: chrome for dialog/, crud/, utilities/, base/, impersonation/,
// useCrudMutations, useDialogData, CreatePage/EditPage/DetailPage.
// Reuse common.* for exact literal matches (save/cancel/close/edit/delete/
// yes/no/create/loading/actions/add/search) — do not duplicate them here.
export const dialog = {
  createSubmit: 'Criar',
  saveSection: 'Salvar seção',
  editSectionAria: 'Editar {section}',
  loadingData: 'Carregando dados...',
  retryLabel: 'Tentar Novamente',
  confirmDeleteTitle: 'Confirmar Exclusão',
  confirmDeleteDescription: 'Tem certeza que deseja excluir este item?',
  confirmActionTitle: 'Confirmar ação',
  confirmActionDescription: 'Tem certeza que deseja executar esta ação?',
  deleting: 'Excluindo...',
  loadDataError: 'Erro ao carregar dados',
  notFound: 'Registro não encontrado',
  defaultTitle: 'Diálogo',
} as const
