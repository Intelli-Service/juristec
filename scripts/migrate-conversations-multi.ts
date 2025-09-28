/**
 * Migration Script: Update existing conversations for multiple conversations support
 * 
 * This script:
 * 1. Adds new fields (title, isActive, lastMessageAt, unreadCount, conversationNumber)
 * 2. Updates roomId format from userId to user_{userId}_conv_{timestamp}
 * 3. Ensures backward compatibility
 */

import mongoose from 'mongoose';
import Conversation from '../apps/websocket-service-nest/src/models/Conversation';

async function migrateConversationsToMulti() {
  try {
    console.log('🚀 Starting conversation migration to multiple conversations support...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/juristec';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all conversations that don't have the new fields
    const conversationsToMigrate = await Conversation.find({
      $or: [
        { title: { $exists: false } },
        { isActive: { $exists: false } },
        { lastMessageAt: { $exists: false } },
        { unreadCount: { $exists: false } },
        { conversationNumber: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${conversationsToMigrate.length} conversations to migrate`);

    for (const conversation of conversationsToMigrate) {
      const userId = conversation.userId;
      
      // Generate conversation number for this user
      const existingUserConversations = await Conversation.countDocuments({
        userId,
        conversationNumber: { $exists: true }
      });
      const conversationNumber = existingUserConversations + 1;
      
      // Generate new roomId format if it's still using old format (userId only)
      let newRoomId = conversation.roomId;
      if (conversation.roomId === userId) {
        newRoomId = `user_${userId}_conv_${conversation._id}`;
      }
      
      // Update conversation with new fields
      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            title: `Conversa #${conversationNumber}`,
            isActive: true, // Mark existing conversations as active
            lastMessageAt: conversation.updatedAt || conversation.createdAt,
            unreadCount: 0, // Start with 0 unread
            conversationNumber,
            roomId: newRoomId, // Update roomId format
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`✅ Migrated conversation ${conversation._id} - User: ${userId}, Number: #${conversationNumber}`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Migrated: ${conversationsToMigrate.length} conversations`);
    console.log(`  - New fields added: title, isActive, lastMessageAt, unreadCount, conversationNumber`);
    console.log(`  - Updated roomId format for better multi-conversation support`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateConversationsToMulti()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateConversationsToMulti;