# Arquitetura Geral - Escritório de Advocacia Online

## Visão Geral

O sistema é uma plataforma online que conecta usuários necessitando de serviços jurídicos a advogados especializados, utilizando IA para otimizar o primeiro atendimento e triagem de casos.

## Objetivos

- Experiência "uau" no primeiro contato: Conversa natural com IA, sem formulários.
- Triagem eficiente: Resolver casos simples via IA, conectar casos complexos a advogados.
- Monetização integrada: Incentivar contratos via plataforma para evitar contatos diretos.

## Tecnologias Principais

- **Frontend:** Next.js (App Router, Server Components, TypeScript, Tailwind CSS)
- **Backend:** NestJS (para processamentos complexos como IA)
- **Banco de Dados:** MongoDB (flexibilidade para dados de usuários, casos, advogados)
- **IA:** Google Gemini API para chat conversacional e triagem
- **Mensageria:** RabbitMQ (se necessário para notificações assíncronas)
- **Autenticação:** JWT/Cookies para sessões, confirmação via email/SMS
- **Pagamentos:** Stripe/PagSeguro para transações via plataforma

## Arquitetura de Alto Nível

### Componentes

1. **Aplicação Web (Next.js)**
   - Landing page com chat de IA
   - Dashboard para advogados
   - Server components para lógica simples (cadastro, histórico)

2. **API Backend (NestJS)**
   - Integração com IA (processamento de prompts, triagem)
   - Gerenciamento de dados (usuários, casos, advogados)
   - APIs para comunicação com frontend

3. **Banco de Dados (MongoDB)**
   - Coleções: Users, Cases, Lawyers, Chats, Payments

4. **Serviços Externos**
   - OpenAI: Para IA conversacional
   - Twilio/SendGrid: Para notificações e confirmações
   - Stripe: Para pagamentos

### Fluxo de Usuário

1. **Entrada:** Usuário acessa site, inicia chat com IA.
2. **Conversa:** IA coleta dados naturalmente, cadastra automaticamente.
3. **Triagem:** IA classifica caso (simples ou complexo).
   - Simples: IA resolve com conselhos e templates.
   - Complexo: IA conecta a advogado disponível.
4. **Conexão:** Advogado recebe notificação, aceita caso.
5. **Contrato:** Proposta via plataforma, pagamento integrado.

### Fluxo de Advogado

1. **Cadastro:** Verificação via OAB, perfil com especialidades.
2. **Dashboard:** Lista de casos disponíveis (filtrados).
3. **Aceitação:** Assumir caso, iniciar comunicação com usuário.
4. **Gerenciamento:** Histórico, relatórios, pagamentos.

### Segurança e Privacidade

- Dados criptografados (AES-256).
- Conformidade LGPD/GDPR.
- Anonimato opcional para usuários.

### Escalabilidade

- Microserviços: Next.js e NestJS separados para deploy independente.
- Cloud: Vercel para frontend, AWS Lambda/EC2 para backend.
- Cache: Redis para sessões e dados frequentes.

### Monetização

- Comissão por caso (10-20%).
- Taxa mensal para advogados premium.
- Benefícios: Garantia, reembolso, histórico centralizado.

## Diagramas

(TODO: Adicionar diagramas Mermaid ou links para imagens)

- Diagrama de arquitetura
- Fluxograma de usuário
- Modelo de dados

## Próximos Passos

- Implementar chat básico com IA real.
- Configurar MongoDB e autenticação.
- Desenvolver dashboard advogado.
- Testes e deploy MVP.
