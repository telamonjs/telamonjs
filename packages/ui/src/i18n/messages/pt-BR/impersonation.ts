export const impersonation = {
  title: 'Logar como outro usuário',
  description:
    'Selecione um usuário para visualizar o sistema com as permissões dele. Você poderá voltar ao seu usuário a qualquer momento.',
  searchPlaceholder: 'Buscar por nome ou e-mail...',
  emptyMessage: 'Nenhum usuário encontrado',
  confirmLabel: 'Logar como usuário',
  userLabel: 'Usuário',
  searching: 'Buscando usuários...',
  searchError: 'Não foi possível buscar os usuários. Tente novamente.',
  confirmError: 'Não foi possível iniciar a impersonation.',
  confirming: 'Entrando...',
  bannerLabel: 'Modo impersonation',
  actingAs: '— você está atuando como <strong>{name}</strong>.',
  actingAsWithOriginal:
    '— você está atuando como <strong>{name}</strong>. Sua conta real é <strong>{original}</strong>.',
  unknownUser: 'outro usuário',
  returning: 'Voltando...',
  backTo: 'Voltar para {name}',
  backToGeneric: 'Voltar ao original',
  stopSuccessDescription: 'Você voltou ao seu usuário original',
  stopErrorDescription: 'Erro ao parar impersonificação. Tente novamente.',
} as const
