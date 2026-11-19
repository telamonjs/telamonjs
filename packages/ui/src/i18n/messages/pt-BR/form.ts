export const form = {
  // Generic
  submitError: 'Erro ao processar formulário',
  unknownError: 'Erro desconhecido',
  invalidField: 'Campo inválido',
  fieldRequired: '{label} é obrigatório',
  tabsAriaLabel: 'Abas de formulário',
  tab: 'Aba {number}',
  stepOf: 'Aba {step} de {total}',
  fieldsAriaLabel: 'Campos do formulário',
  create: 'Criar',
  cancelForm: 'Cancelar formulário',
  saveForm: 'Salvar formulário',
  savingForm: 'Salvando formulário',

  // Wizard
  fillRequiredFields: 'Preencha todos os campos obrigatórios',
  submitSuccess: 'Formulário enviado com sucesso!',
  reviewTitle: 'Revisão',
  reviewDescription: 'Revise suas informações',
  reviewHeading: 'Revise suas informações',
  reviewInstructions:
    'Verifique todos os dados antes de enviar. Você pode editar qualquer seção clicando no botão de edição.',
  attachedFile: 'Arquivo anexado',
  draftRestored: {
    title: 'Rascunho encontrado',
    description: 'Seus dados anteriores foram restaurados',
  },
  draftSavedAt: 'Rascunho salvo às {time}',
  discardDraft: 'Descartar rascunho',
  confirmAndSubmit: 'Confirmar e Enviar',
  finish: 'Concluir',

  // Unsaved changes guard
  unsavedChanges: {
    title: 'Descartar alterações?',
    description:
      'Você tem alterações não salvas nesta seção. Se sair agora, elas serão perdidas.',
    stay: 'Continuar editando',
    leave: 'Descartar',
  },

  // Week days selector
  weekDays: {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
  },
  weekDaysSelected: 'Dias selecionados:',

  // Date / time fields
  selectDateForTime: 'Selecione uma data para definir o horário',
  selectDateTime: 'Selecione uma data e hora',
  selectTime: 'Selecione o horário...',
  selectRange: 'Selecione o período...',
  openCalendar: 'Abrir calendário',
  datePlaceholder: 'DD/MM/AAAA',
  dateTimePlaceholder: 'DD/MM/AAAA HH:mm',
  maskPlaceholder: 'Digite seguindo o padrão: {mask}',
  enterText: 'Digite {label}',
  selectLabel: 'Selecione {label}',
  richTextPlaceholder: 'Digite o conteúdo...',
  richTextEditor: 'Editor de texto',
  svgPlaceholder: 'Insira o código SVG...',
  colorTextLabel: '{label} (texto)',
  relationshipMissingLoader: 'Campo relationship requer uma função loadField',

  // File upload
  uploadDrop: 'Clique para enviar ou arraste e solte',
  dropHere: 'Solte os arquivos aqui',
  acceptedExtensions: 'Extensões: {accept}',
  anyFileType: 'Qualquer tipo de arquivo',
  uploadLimit: 'Limite: {size}',
  maxFiles: '{count, plural, one {Máx.: # arquivo} other {Máx.: # arquivos}}',
  singleFileOnly: 'Apenas 1 arquivo',
  noFileSelected: 'Nenhum arquivo selecionado',
  existingFile: 'Arquivo existente',
  fileOnServer: 'Arquivo no servidor',
  uploaded: 'Enviado',
  removeFile: 'Remover arquivo',
  uploadMax: 'Arquivo muito grande. Limite: {size}',
  uploadInvalidType: 'Tipo de arquivo não aceito. Extensões: {accept}',
  uploadMaxFiles:
    '{count, plural, one {Máximo # arquivo permitido} other {Máximo # arquivos permitidos}}',
  unnamedFile: 'arquivo',
  downloadFile: 'Baixar arquivo',
  downloadFileError: 'Erro ao baixar o arquivo',
  selectFile: 'Selecionar arquivo',
  sending: 'Enviando...',
  processFileError: 'Erro ao processar arquivo',
  uploadFileError: 'Erro ao fazer upload do arquivo',
  fileFieldTooBig: 'Arquivo muito grande. Máximo: {size}MB',

  // Validation errors panel
  correctFields: 'Corrija os seguintes campos:',
  attention: 'Atenção',

  // Rich text toolbar
  toolbar: {
    bold: 'Negrito',
    italic: 'Itálico',
    strikethrough: 'Tachado',
    code: 'Código',
    heading1: 'Título 1',
    heading2: 'Título 2',
    heading3: 'Título 3',
    bulletList: 'Lista com marcadores',
    orderedList: 'Lista numerada',
    quote: 'Citação',
    insertLink: 'Inserir link',
    insertImage: 'Inserir imagem',
    insertTable: 'Inserir tabela',
    insertHr: 'Inserir linha horizontal',
    undo: 'Desfazer',
    redo: 'Refazer',
  },
  fixFields: 'Por favor, corrija os seguintes campos: {fields}',
  saveDataError: 'Ocorreu um erro ao salvar os dados',
} as const
