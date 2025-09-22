import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);