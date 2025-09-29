import mongoose from 'mongoose';
import Conversation from '../apps/websocket-service-nest/src/models/Conversation';

async function migrateExistingConversations() {
  try {
    console.log('🚀 Iniciando migração de conversas existentes...');

    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/juristec');
    console.log('✅ Conectado ao MongoDB');

    // Buscar todas as conversas que não têm os novos campos
    const conversations = await Conversation.find({
      $or: [
        { title: { $exists: false } },
        { isActive: { $exists: false } },
        { lastMessageAt: { $exists: false } },
        { unreadCount: { $exists: false } },
        { conversationNumber: { $exists: false } }
      ]
    });

    console.log(`📊 Encontradas ${conversations.length} conversas para migrar`);

    // Agrupar conversas por userId para numeração sequencial
    const conversationsByUser = new Map<string, any[]>();

    for (const conv of conversations) {
      if (!conversationsByUser.has(conv.userId)) {
        conversationsByUser.set(conv.userId, []);
      }
      conversationsByUser.get(conv.userId)!.push(conv);
    }

    let migratedCount = 0;

    // Migrar cada grupo de conversas por usuário
    for (const [userId, userConversations] of conversationsByUser) {
      // Ordenar por data de criação para numeração sequencial
      userConversations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (let i = 0; i < userConversations.length; i++) {
        const conv = userConversations[i];
        const conversationNumber = i + 1;

        // Gerar novo roomId no formato user_{userId}_conv_{timestamp}
        const newRoomId = `user_${userId}_conv_${conv.createdAt.getTime()}`;

        console.log(`🔄 Migrando conversa ${conv._id} do usuário ${userId} (número ${conversationNumber})`);

        await Conversation.updateOne(
          { _id: conv._id },
          {
            $set: {
              title: `Conversa #${conversationNumber}`,
              isActive: true,
              lastMessageAt: conv.updatedAt || conv.createdAt,
              unreadCount: 0,
              conversationNumber,
              roomId: newRoomId // Atualizar roomId para o novo formato
            }
          }
        );

        migratedCount++;
      }
    }

    console.log(`✅ Migração concluída! ${migratedCount} conversas migradas`);

    // Verificar se há conflitos de roomId
    const duplicates = await Conversation.aggregate([
      { $group: { _id: '$roomId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length > 0) {
      console.warn('⚠️  Encontrados roomIds duplicados após migração:', duplicates);
    } else {
      console.log('✅ Nenhum conflito de roomId detectado');
    }

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar migração
migrateExistingConversations().catch(console.error);