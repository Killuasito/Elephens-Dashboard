# 🐘 Elephens Dashboard

Dashboard SaaS multi-tenant construído com **Next.js**, **TypeScript**, **Tailwind CSS v4** e **Firebase**. Arquitetura modular com controle de permissões por usuário e suporte a múltiplos módulos ativáveis pelo administrador.

---

## 🚀 Tecnologias

| Pacote | Versão | Uso |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16.2.1 | App Router, API Routes, middleware |
| [TypeScript](https://www.typescriptlang.org/) | ^5 | Tipagem estrita |
| [Tailwind CSS](https://tailwindcss.com/) | ^4 | Estilização utilitária |
| [Firebase](https://firebase.google.com/) | ^12 | Auth + Firestore (client) |
| [firebase-admin](https://firebase.google.com/docs/admin/setup) | ^13 | Gerenciamento de usuários (server) |
| [react-icons](https://react-icons.github.io/) | ^5 | Ícones |
| [recharts](https://recharts.org/) | ^3 | Gráficos |
| [react-markdown](https://github.com/remarkjs/react-markdown) | ^10 | Renderização de markdown (chatbot) |
| [clsx](https://github.com/lukeed/clsx) | ^2 | Classes condicionais |

---

## 📦 Módulos disponíveis

| Módulo | Descrição |
|---|---|
| **Dashboard** | Visão geral com KPIs e gráficos |
| **Clientes** | Cadastro e gestão de clientes |
| **Produtos** | Catálogo e controle de estoque |
| **Tarefas** | Kanban de atividades |
| **Financeiro** | Receitas, despesas e fluxo de caixa |
| **Relatórios** | Gráficos e análises |
| **Chatbot IA** | Assistente via OpenRouter (streaming) |
| **Documentos** | Upload e gestão de arquivos |
| **Importação** | Importar dados via JSON |
| **Configurações** | Perfil, tema e zona de perigo |
| **Admin** | Criar/editar/excluir usuários e permissões |

Cada módulo pode ser ativado ou desativado por usuário pelo administrador.

---

## ⚙️ Configuração

### 1. Criar projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Ative o **Authentication** → método **E-mail/Senha**
3. Ative o **Firestore Database**
4. Em **Configurações → Seus apps**, adicione um app Web e copie o `firebaseConfig`

### 2. Criar conta de serviço (Admin SDK)

Necessário para criar e excluir usuários via API:

1. Firebase Console → **Configurações do projeto → Contas de serviço**
2. Clique em **Gerar nova chave privada** → baixe o JSON
3. Copie `client_email` e `private_key` para o `.env.local`

### 3. Variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Admin
NEXT_PUBLIC_ADMIN_EMAIL=admin@seudominio.com

# Firebase Admin SDK (do JSON da conta de serviço)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OpenRouter — ChatBot IA (obtenha em openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-...
```

> ⚠️ Nunca exponha `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` ou `OPENROUTER_API_KEY` no cliente. O prefixo `NEXT_PUBLIC_` torna a variável pública.

---

## 🛠️ Instalação e execução

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/elephens-dashboard.git
cd elephens-dashboard

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# Crie .env.local conforme a seção acima

# 4. Rode em modo de desenvolvimento
npm run dev
```

Acesse em [http://localhost:3000](http://localhost:3000).

---

## 🗂️ Estrutura de pastas

```
dashboard-elephens/
├── app/
│   ├── (auth)/
│   │   └── login/            # Tela de login (split-screen)
│   ├── (dashboard)/
│   │   ├── layout.tsx        # Shell persistente (Sidebar + Navbar)
│   │   ├── admin/            # Gerenciamento de usuários
│   │   ├── chatbot/          # Chat com IA via streaming
│   │   ├── clientes/         # CRUD de clientes
│   │   ├── configuracoes/    # Perfil, tema, exclusão de dados
│   │   ├── dashboard/        # Visão geral / KPIs
│   │   ├── documentos/       # Upload e listagem de arquivos
│   │   ├── financeiro/       # Receitas e despesas com filtros
│   │   ├── importacao/       # Importação via JSON
│   │   ├── produtos/         # Catálogo de produtos
│   │   ├── relatorios/       # Gráficos e relatórios
│   │   └── tarefas/          # Kanban
│   ├── api/
│   │   ├── admin/usuarios/   # POST (criar) / DELETE (excluir) usuário
│   │   ├── chat/             # Rota de streaming do chatbot
│   │   └── upload/           # Upload de documentos
│   ├── globals.css
│   └── layout.tsx            # Layout raiz
├── components/
│   ├── layout/               # Sidebar, Navbar, DashboardLayout
│   └── ui/                   # StatCard, DataTable, FormInput, ToggleSwitch
├── hooks/
│   ├── useAuth.ts            # Autenticação Firebase
│   ├── useFirestore.ts       # CRUD Firestore genérico
│   └── usePermissoes.ts      # Permissões por módulo
├── lib/
│   ├── firebase.ts           # Inicialização Firebase client
│   ├── firebase-admin.ts     # Inicialização Firebase Admin (server-only)
│   └── modulos.ts            # Definição central dos módulos
├── types/index.ts            # Interfaces TypeScript
└── middleware.ts             # Proteção de rotas via cookie
```

---

## 🔐 Autenticação e permissões

- O `middleware.ts` protege todas as rotas do dashboard verificando o cookie `firebase-auth-token`
- Cada usuário possui um documento `permissoes/{uid}` no Firestore com os módulos habilitados
- O administrador (definido por `NEXT_PUBLIC_ADMIN_EMAIL`) pode ativar/desativar módulos por usuário e criar ou excluir contas diretamente pelo painel Admin
- As API routes de admin verificam o token via **Firebase Admin SDK** antes de executar qualquer operação

---

## 🤖 Chatbot IA

Utiliza a API [OpenRouter](https://openrouter.ai/) com o modelo `nvidia/nemotron-3-nano-30b-a3b:free` via streaming (Edge Runtime). Configure `OPENROUTER_API_KEY` no `.env.local`.

---

## 📄 Licença

MIT — use e modifique livremente.