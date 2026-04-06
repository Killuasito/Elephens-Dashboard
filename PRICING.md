# Preços e justificativa — Elephens Dashboard

Este documento registra a proposta de preços discutida e explica o racional por trás de cada faixa, junto com recomendações operacionais para proteger margem e permitir upsell.

## Preços propostos (sugestão do time)
- Basic: R$99,98 / mês — libera 3 módulos
- Pro: R$129,98 / mês — libera 6 módulos
- Premium: R$149,99 / mês — libera 9 módulos

Observação: estes valores foram sugeridos para serem simples e fáceis de comunicar.

## Racional e riscos
- Simplicidade: preços por bundles de módulos (3 / 6 / 9) facilitam o discurso comercial e o checkout.
- Incentivo ao upgrade: margens pequenas entre Pro e Premium (R$20,01) podem levar muitos clientes a escolher o topo, reduzindo ARPU potencial sem garantir cobertura do custo variável.
- Custos variáveis: Chatbot IA (OpenRouter) e Storage (Firebase Storage / Firestore) têm custo por uso; incluir estes recursos sem quota pode explodir o custo por cliente.

## Regras operacionais recomendadas (para cada tier)
- Limites de usuários: Basic 5 usuários; Pro 20 usuários; Premium ilimitado.
- Limites de armazenamento: Basic 5 GB; Pro 20 GB; Premium 100 GB.
- Chatbot (IA): tratar como quota ou add‑on — ex.: Pro 100k tokens/mês; Premium 300k tokens/mês; extras cobrados.
- Suporte e onboarding: Basic suporte por ticket; Pro onboarding leve; Premium onboarding dedicado + SLA.

## Alternativa de precificação (opção que eu recomendo)
- Basic: R$79,90/mês — 3 módulos, 5 usuários, 5 GB, suporte básico.
- Pro: R$149,90/mês — 6 módulos, 20 usuários, 20 GB, 100k tokens/mês, onboarding leve.
- Premium: R$249,90/mês — 9 módulos, usuários ilimitados, 100 GB, 300k tokens/mês, SLA + onboarding dedicado.

Motivação: maior espaçamento entre tiers preserva margem e justifica upgrade com limites/benefícios claros.

## Recomendações de lançamento e validação
- Trial: 14 dias grátis para reduzir barreira de entrada.
- Desconto anual: 2 meses grátis no pagamento anual (≈16% off).
- A/B test: testar R$129,98 vs R$159,98 para o tier intermediário durante os primeiros 3 meses com early customers.
- Monitorar métricas-chave: CAC, churn, MRR, ARPU e custo médio por cliente (incluir custo de tokens, storage e horas de suporte).

## Próximos passos práticos
1. Definir quotas exatas para uso do Chatbot e armazenamento por tier.
2. Calcular unit economics (custo médio por cliente) usando estimativas de tokens/GB/horas de suporte. Posso ajudar se fornecer números aproximados.
3. Preparar página de preços no site (texto claro sobre quotas e add‑ons) e documentos de vendas.

---
Arquivo gerado automaticamente — ajuste e publique conforme estratégia comercial.
