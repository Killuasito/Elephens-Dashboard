// Definição dos planos de uso do ChatBot IA
// Cada plano define o limite de mensagens por mês para o assistente

export const PLANOS = {
  basic:      { label: "Basic",      limite: 20,       cor: "gray"   },
  pro:        { label: "Pro",        limite: 100,      cor: "blue"   },
  enterprise: { label: "Enterprise", limite: Infinity, cor: "purple" },
} as const;

export type PlanoId = keyof typeof PLANOS;

export const PLANO_PADRAO: PlanoId = "basic";
