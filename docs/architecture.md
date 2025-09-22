# Arquitetura Geral - Escritório de Advocacia Online

## Visão Geral

O sistema é uma plataforma online que conecta usuários necessitando de serviços jurídicos a advogados especializados, utilizando IA para otimizar o primeiro atendimento e triagem de casos.

## Status Atual da Implementação

### ✅ Implementado
- **Landing Page**: Design profissional com seções de hero, recursos, depoimentos e footer
- **Chat em Tempo Real**: Interface responsiva com WebSocket usando NestJS + Socket.io
- **Integração com IA**: Google Gemini API para assistente jurídico em português
- **Persistência de Conversas**: MongoDB com Mongoose para histórico de mensagens
- **Design System**: Paleta de cores jurídica (navy blue, slate gray, emerald green)
- **Layout Responsivo**: Chat centralizado com altura limitada (80vh) para melhor UX

### 🚧 Em Desenvolvimento
- **Autenticação**: Sistema básico de reconhecimento por dispositivo
- **Dashboard de Advogados**: Interface para gerenciamento de casos
- **Integração de Pagamentos**: Stripe para contratos via plataforma

### 📋 Próximos Passos
- Implementar autenticação completa (email/SMS)
- Desenvolver dashboard para advogados
- Adicionar sistema de triagem avançada
- Implementar pagamentos e contratos

## Tecnologias Principais

- **Frontend:** Next.js (App Router, Server Components, TypeScript, Tailwind CSS)
- **Backend:** NestJS com Socket.io para WebSocket e processamento de IA
- **Banco de Dados:** MongoDB com Mongoose para dados flexíveis de usuários, casos e conversas
- **IA:** Google Gemini API para chat conversacional e triagem jurídica
- **Comunicação em Tempo Real:** Socket.io com NestJS para chat persistente
- **Autenticação:** JWT/Cookies para sessões, confirmação via email/SMS
- **Pagamentos:** Stripe/PagSeguro para transações via plataforma

## Arquitetura de Alto Nível

### Componentes Implementados

1. **Aplicação Web (Next.js)**
   - Landing page profissional com design jurídico
   - Chat interface responsiva com WebSocket
   - Componentes reutilizáveis com TypeScript
   - Server components para otimização de performance

2. **Serviço WebSocket (NestJS)**
   - ChatGateway com Socket.io para comunicação em tempo real
   - Integração com Google Gemini API
   - Persistência de conversas no MongoDB
   - Gerenciamento de salas de chat (rooms)

3. **Banco de Dados (MongoDB)**
   - Coleções: Conversations, Messages, Users (futuro)
   - Esquema flexível para dados jurídicos
   - Histórico completo de interações

4. **Serviços Externos**
   - Google Gemini: Para IA conversacional jurídica
   - Stripe: Para pagamentos (planejado)
   - Serviços de notificação: Para confirmações (futuro)

### Fluxo de Usuário Atual

1. **Entrada:** Usuário acessa landing page profissional
2. **Chat Inicial:** Interface de boas-vindas com áreas de atuação
3. **Conversa:** Chat em tempo real com IA jurídica
4. **Persistência:** Conversas salvas automaticamente no MongoDB
5. **Triagem:** IA classifica e responde consultas (simples/complexas)

### Fluxo Técnico

1. **Frontend (Next.js)**: Interface responsiva com Socket.io client
2. **WebSocket (NestJS)**: Gerencia conexões e salas de chat
3. **IA Integration**: Processa mensagens via Google Gemini API
4. **Database**: Persiste conversas e mensagens
5. **Real-time Sync**: Atualização instantânea entre usuários

### Segurança e Privacidade

- Dados criptografados (AES-256).
- Conformidade LGPD/GDPR.
- Anonimato opcional para usuários.
- Variáveis de ambiente para chaves sensíveis.

### Escalabilidade

- **Microserviços**: Next.js e NestJS separados para deploy independente
- **WebSocket**: Suporte a múltiplas salas de conversa
- **Database**: MongoDB escalável para dados não-relacionais
- **Cloud**: Pronto para Vercel (frontend) e AWS (backend)

### Design System

- **Cores**: Navy blue (#1e293b) para headers, Emerald (#059669) para destaques, Slate para backgrounds
- **Tipografia**: Fontes modernas e legíveis
- **Layout**: Responsivo com breakpoints Tailwind
- **Animações**: Micro-interações suaves para melhor UX

## Diagramas

### Arquitetura Atual
```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Next.js App   │◄──────────────►│ NestJS Service  │
│   (Port 3000)   │                │  (Port 4000)   │
│                 │                │                 │
│ - Landing Page  │                │ - ChatGateway   │
│ - Chat UI       │                │ - Gemini AI     │
│ - Responsive    │                │ - MongoDB       │
└─────────────────┘                └─────────────────┘
         │                                 │
         └───────────────► MongoDB ◄──────┘
```

### Fluxo de Dados do Chat
```
User Message → Socket.io → NestJS Gateway → Gemini API → Response → MongoDB → UI Update
```

## Próximos Passos Detalhados

### Fase 2: Autenticação e Usuários
- Implementar sistema de cadastro/login
- Confirmação via email/SMS
- Perfis de usuário no MongoDB

### Fase 3: Dashboard de Advogados
- Interface para advogados se cadastrarem
- Sistema de especialidades e disponibilidade
- Gerenciamento de casos atribuídos

### Fase 4: Triagem Avançada
- Algoritmo de classificação de casos
- Conexão automática com advogados disponíveis
- Sistema de propostas e contratos

### Fase 5: Monetização
- Integração com Stripe
- Sistema de comissões
- Relatórios financeiros

### Fase 6: Produção
- Deploy na Vercel e AWS
- Monitoramento e logs
- Testes de carga e segurança
