// Script de inicialização do banco de dados para testes E2E
// Este script roda automaticamente quando o container MongoDB inicia

// Conectar ao banco
const db = connect('mongodb://admin:password@localhost:27017/juristec_test?authSource=admin');

// Criar usuários de teste
const users = [
  {
    _id: ObjectId(),
    email: 'admin@demo.com',
    name: 'Administrador Demo',
    password: '$2b$10$hashedpassword', // senha: admin123
    role: 'super_admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    email: 'lawyer@demo.com',
    name: 'Advogado Demo',
    password: '$2b$10$hashedpassword', // senha: lawyer123
    role: 'lawyer',
    isActive: true,
    specialties: ['Direito Civil', 'Direito Trabalhista'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    email: 'client@demo.com',
    name: 'Cliente Demo',
    password: '$2b$10$hashedpassword', // senha: client123
    role: 'client',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Inserir usuários
db.users.insertMany(users);

// Criar configurações de IA para testes
const aiConfigs = [
  {
    _id: ObjectId(),
    name: 'Assistente Jurídico PT-BR',
    prompt: 'Você é um assistente jurídico brasileiro especializado em direito civil e trabalhista. Colete dados do usuário naturalmente durante a conversa e identifique se o caso é simples (pode ser resolvido com orientações básicas) ou complexo (necessita de advogado). Sempre responda em português brasileiro.',
    model: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 2000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Inserir configurações de IA
db.aiconfigs.insertMany(aiConfigs);

// Criar conversas de teste
const conversations = [
  {
    _id: ObjectId(),
    userId: users[2]._id, // client@demo.com
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [
      {
        _id: ObjectId(),
        role: 'user',
        content: 'Olá, preciso de ajuda com um problema trabalhista.',
        timestamp: new Date(Date.now() - 300000) // 5 minutos atrás
      },
      {
        _id: ObjectId(),
        role: 'assistant',
        content: 'Olá! Sou um assistente jurídico e posso ajudar com questões trabalhistas. Pode me contar mais sobre a sua situação? Por exemplo, qual é o problema específico que você está enfrentando?',
        timestamp: new Date(Date.now() - 240000) // 4 minutos atrás
      }
    ]
  }
];

// Inserir conversas
db.conversations.insertMany(conversations);

// Criar índices para performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.conversations.createIndex({ userId: 1 });
db.conversations.createIndex({ status: 1 });
db.conversations.createIndex({ createdAt: -1 });
db.messages.createIndex({ conversationId: 1 });
db.messages.createIndex({ timestamp: -1 });

print('✅ Banco de dados de teste inicializado com sucesso!');
print('📊 Usuários criados:');
users.forEach(user => {
  print(`   - ${user.email} (${user.role})`);
});
print('🤖 Configurações de IA criadas:', aiConfigs.length);
print('💬 Conversas de teste criadas:', conversations.length);