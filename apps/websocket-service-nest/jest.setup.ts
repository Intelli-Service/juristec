// Jest setup file for consistent mocking across environments
// This ensures mocks are loaded before any test files

// Mock function-calling module to prevent CI resolution issues
jest.mock('../function-calling', () => ({
  registerUserFunction: {
    name: 'register_user',
    description: 'Registra um novo usuário no sistema com os dados coletados',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome completo do usuário' },
        email: { type: 'string', description: 'Email do usuário' },
        phone: { type: 'string', description: 'Telefone do usuário (opcional)' },
      },
      required: ['name', 'email'],
    },
  },
  updateConversationStatusFunction: {
    name: 'update_conversation_status',
    description: 'Atualiza o status de uma conversa',
    parameters: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', description: 'ID da conversa' },
        status: {
          type: 'string',
          description: 'Novo status da conversa',
          enum: ['active', 'resolved_by_ai', 'assigned_to_lawyer', 'completed'],
        },
      },
      required: ['conversationId', 'status'],
    },
  },
}));