# Guia de Instruções para Desenvolvimento - Escritório de Advocacia Online

Este documento serve como guia para manter o foco no desenvolvimento do sistema de escritório de advocacia online, baseado nas discussões iniciais. Ele resume os objetivos, premissas e diretrizes para garantir um MVP rápido e bem estruturado.

## Visão Geral do Projeto

O sistema é uma plataforma online que conecta pessoas necessitando de serviços jurídicos a advogados especializados. O diferencial é uma experiência "uau" no primeiro contato, utilizando IA para atendimento inicial, triagem de casos e conexão com advogados. Monetização via comissão em contratos realizados pela plataforma.

### Funcionalidades Chave

- **Experiência do Usuário:** Conversa natural com IA (sem formulários), cadastro automático, triagem (casos simples resolvidos por IA, complexos conectados a advogados).
- **Sistema de Cadastro:** Reconhecimento por dispositivo, login cross-device via confirmação (email/SMS), modo anônimo.
- **Ferramentas para Advogados:** Dashboard para visualizar e aceitar casos disponíveis.
- **Monetização:** Pagamentos integrados via plataforma, com incentivos para evitar contatos diretos.

### Tecnologias Iniciais

- **Frontend:** Next.js (App Router, Server Components, TypeScript, Tailwind CSS).
- **Backend:** NestJS (para processamentos complexos como IA).
- **Banco:** MongoDB.
- **IA:** Google Gemini API (inicial, por custo; futuro: múltiplos modelos).
- **Outros:** JWT/Cookies para autenticação, Stripe/PagSeguro para pagamentos.

## Premissas Gerais

- **Segurança:** Nunca colocar variáveis sensíveis (chaves API, senhas, URLs de DB) no código. Usar arquivos `.env` sempre. Exemplo: `GOOGLE_API_KEY` em `.env`, carregado via `process.env`.
- **Privacidade:** Conformidade básica com LGPD/GDPR. Dados criptografados, anonimato opcional.
- **MVP Focado:** Priorizar funcionalidades essenciais para lançamento rápido. Evitar complexidade desnecessária (ex.: RabbitMQ só se provar necessário).
- **Escalabilidade Inicial:** Estrutura monorepo para microserviços futuros, mas começar simples.
- **Testes:** Usar mocks apenas para testes automatizados. Código principal usa APIs reais (ex.: Gemini).
- **Monetização:** Integrar pagamentos desde o início para incentivar uso da plataforma.

## Arquitetura de Código

Manter o código limpo, modular e escalável, mas sem over-engineering para o MVP. Seguir boas práticas para facilitar manutenção e evolução.

### Princípios Gerais

- **Separação de Responsabilidades:** Frontend (UI/UX), Backend (lógica/IA), DB (dados).
- **Modularidade:** Usar módulos em NestJS, componentes em Next.js.
- **TypeScript:** Tipagem forte em tudo para reduzir bugs.
- **Server Components:** Priorizar em Next.js para reduzir APIs desnecessárias.
- **Versionamento:** Git com branches (main, develop, features).
- **Documentação:** Atualizar docs/ conforme mudanças.

### Estrutura de Código

- **Frontend (apps/next-app):**
  - `src/app/`: Páginas (ex.: `/chat` para conversa IA, `/dashboard` para advogados).
  - `src/components/`: Componentes reutilizáveis (ChatUI, CaseCard).
  - `src/lib/`: Utilitários (conexão com API, helpers).
  - `src/types/`: Tipos TypeScript compartilhados.
- **Backend (apps/nest-api - futuro):**
  - Módulos: `users/`, `cases/`, `ai/`, `payments/`.
  - Services para lógica de negócio.

### Boas Práticas

- **Commits:** Mensagens claras (ex.: "feat: add chat component").
- **Linting/Formatação:** ESLint + Prettier configurados.
- **Variáveis de Ambiente:** Arquivo `.env.example` com placeholders, `.env` ignorado no Git.
- **Erros:** Tratamento centralizado, logs para debug.
- **Performance:** Otimizar renders em Next.js, lazy loading.
- **Acessibilidade:** Seguir WCAG básico para UI.

### Integração com IA (Gemini)

- Usar Google AI Studio ou SDK oficial para Gemini.
- Prompt inicial: "Você é um assistente jurídico brasileiro. Colete dados do usuário naturalmente, triagem casos simples/complexos, conecte advogados se necessário."
- Chamadas: Via backend (NestJS) para segurança, retornando respostas para frontend.
- Limites: Monitorar custos, implementar rate limiting.

## Próximos Passos

Baseado na conversa inicial, priorizar:

1. **Configurar Integração com Gemini:** Instalar SDK, configurar .env, testar chamada básica.
2. **Implementar Chat Básico:** Componente de chat em Next.js, conectar com IA real.
3. **Cadastro Automático:** Lógica para coletar dados na conversa, salvar em MongoDB.
4. **Triagem de Casos:** IA classifica e decide próximos passos.
5. **Dashboard Advogado:** Lista de casos, ações básicas.
6. **Pagamentos:** Integração com Stripe para contratos.
7. **Testes e Deploy:** Validação MVP, deploy em Vercel/AWS.

Manter foco no "uau" da experiência: Fluidez, naturalidade, eficiência. Iterar baseado em feedback para refinar.
