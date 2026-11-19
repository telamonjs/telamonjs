#!/usr/bin/env node
// Fails when a pt-BR UI literal survives in src/ (outside i18n/messages, tests, stories, docs).
// Only string literals and JSX text count; comments are stripped first.
// Opt-out per line with `// i18n-ignore` (domain identifiers, fixtures).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../src/', import.meta.url).pathname
const SKIP = /(^|\/)(i18n\/messages|test|docs)\/|\.(test|stories)\.(ts|tsx)$|\.md$|\.d\.ts$/
const WORDS =
  /\b(Salvar|Cancelar|Buscar|Excluir|Carregando|Nenhum|Nenhuma|Confirmar|Voltar|Anterior|Selecione|Filtros?|Limpar|Novo|Nova|Editar|Fechar|Sair|Entrar|Remover|Adicionar|Enviar|Sim|Não|Página|Exportar|Atualizar|Visualizar|Detalhes|Ativo|Inativo|Hoje|Ontem|Total|Todos|Obrigatório|Opcional|Criar|Criando|Salvando|Gravar|Concluir|Continuar|Prosseguir|Aplicar|Desfazer|Copiar|Baixar|Importar|Imprimir|Pesquisar|Mostrar|Ocultar|Abrir|Erro|Sucesso|Aviso|Resultados?|Itens|Registros?|Selecionados?|Carregar|Tentar|Ver mais|Ver menos)\b/
// Unaccented pt-BR text slips past WORDS/ACCENT ("Criar", "Puxe para atualizar"): catch the
// connectives of a pt-BR phrase. Excludes "no"/"as" ("use no memo", English prose).
const PHRASE = /\b[A-Za-zÀ-ÿ]+ (para|ao|aos|dos|das|uma|com|sem|pelo|pela|os|um|na|nos|nas|de|do|da) [A-Za-zÀ-ÿ]+/
const ACCENT = /[ãõáéíóúâêôçÃÕÁÉÍÓÚÂÊÔÇ]/
const IGNORE = /i18n-ignore/

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* files(p)
    else if (/\.(ts|tsx)$/.test(name)) yield p
  }
}
// Block comments are blanked, not removed, so line numbers stay aligned with the raw file.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, '')).replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
// string literals ('..', "..", `..`) and JSX text (>..<)
const LITERALS = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|>[^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*</g

const hits = []
for (const file of files(ROOT)) {
  const rel = relative(ROOT, file)
  if (SKIP.test(rel)) continue
  const raw = readFileSync(file, 'utf8').split('\n')
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n')
  lines.forEach((line, i) => {
    // The marker lives in a comment, so check the raw line (comments are stripped above).
    if (IGNORE.test(raw[i] ?? '')) return
    for (const lit of line.match(LITERALS) ?? []) {
      if (ACCENT.test(lit) || WORDS.test(lit) || PHRASE.test(lit)) {
        hits.push(`${rel}:${i + 1}  ${lit.trim().slice(0, 80)}`)
        break
      }
    }
  })
}
if (hits.length) {
  console.error(`✗ ${hits.length} pt-BR UI literal(s) outside i18n/messages:\n  ${hits.join('\n  ')}`)
  process.exit(1)
}
console.log('✓ i18n literals: clean')
