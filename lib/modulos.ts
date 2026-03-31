// Definição central de todos os módulos disponíveis no dashboard
// Adicione ou remova módulos aqui para refletir em todo o sistema

export const MODULOS_IDS = [
  "clientes",
  "produtos",
  "tarefas",
  "financeiro",
  "relatorios",
  "chatbot",
  "documentos",
  "importacao",
] as const;

export type ModuloId = (typeof MODULOS_IDS)[number];

export const MODULOS_INFO: Record<ModuloId, { label: string; descricao: string }> = {
  clientes:  { label: "Clientes",   descricao: "Gestão de clientes e contatos" },
  produtos:  { label: "Produtos",   descricao: "Catálogo e controle de estoque" },
  tarefas:   { label: "Tarefas",    descricao: "Kanban de atividades" },
  financeiro:{ label: "Financeiro", descricao: "Receitas, despesas e saldo" },
  relatorios:{ label: "Relatórios", descricao: "Gráficos e métricas consolidadas" },
  chatbot:   { label: "ChatBot IA",  descricao: "Assistente inteligente com análise financeira" },
  documentos:  { label: "Documentos",  descricao: "Gestão de arquivos PDF com descrições" },
  importacao:  { label: "Importação",   descricao: "Importar dados de outro sistema via JSON" },
};

// Permissões padrão ao criar um novo usuário — todos os módulos habilitados
export const MODULOS_PADRAO: Record<ModuloId, boolean> = {
  clientes:   true,
  produtos:   true,
  tarefas:    true,
  financeiro: true,
  relatorios: true,
  chatbot:    true,
  documentos:  true,
  importacao:  true,
};
