// Interfaces globais reutilizáveis em todo o template
// Expanda conforme a necessidade de cada projeto cliente

import { User } from "firebase/auth";
import type { ModuloId } from "@/lib/modulos";

// Permissões de acesso por módulo de um usuário
export interface Permissao {
  uid: string;
  email: string;
  nome?: string;
  nomeApp?: string;
  modulos: Record<ModuloId, boolean>;
  criadoEm?: string;
}

// Usuário autenticado no sistema
export interface Usuario {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Documento genérico do Firestore (todo documento tem um id)
export interface Documento {
  id: string;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

// Entidade Cliente — base para módulos de PDV, contabilidade, etc.
export interface Cliente extends Documento {
  nome: string;
  email: string;
  telefone?: string;
  status: "ativo" | "inativo";
  documento?: string; // CPF ou CNPJ
}

// Entidade Produto
export interface Produto extends Documento {
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  status: "ativo" | "inativo" | "esgotado";
}

// Entidade Tarefa
export interface Tarefa extends Documento {
  titulo: string;
  descricao?: string;
  prioridade: "baixa" | "media" | "alta";
  status: "pendente" | "em_andamento" | "concluida";
}

// Entidade Arquivo (módulo Documentos — PDFs armazenados no Firebase Storage)
export interface Arquivo extends Documento {
  nome: string;
  descricao: string;
  url: string;
  storagePath: string;
  tamanhoBytes: number;
  uid: string;
}

// Entidade Transação Financeira
export interface Transacao extends Documento {
  descricao: string;
  tipo: "receita" | "despesa";
  valor: number;
  categoria: string;
  data: string;
  // Integrações com outros módulos
  produtoId?: string;
  produtoNome?: string;
  quantidade?: number;
  clienteId?: string;
  clienteNome?: string;
}

// Retorno do hook de autenticação
export interface AuthHookReturn {
  user: User | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Props do StatCard
export interface StatCardProps {
  titulo: string;
  valor: string | number;
  icone: React.ReactNode;
  variacao?: string;
  cor?: "blue" | "green" | "amber" | "red";
}

// Coluna da DataTable
export interface Coluna {
  chave: string;
  label: string;
}

// Props da DataTable
export interface DataTableProps<T extends object = Record<string, unknown>> {
  colunas: Coluna[];
  dados: T[];
  onEditar?: (item: T) => void;
  onDeletar?: (item: T) => void;
}