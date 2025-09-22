import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { GeminiService } from '../lib/gemini.service';
import Conversation from '../models/Conversation';
import Message from '../models/Message';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // Allow Next.js
    methods: ['GET', 'POST'],
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly geminiService: GeminiService) {}

  handleConnection(client: Socket) {
    console.log('Usuário conectado:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Usuário desconectado:', client.id);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.join(roomId);
    console.log(`Usuário ${client.id} entrou na sala ${roomId}`);

    try {
      const conversation = await Conversation.findOne({ roomId });
      if (conversation) {
        const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
        client.emit('load-history', messages.map(msg => ({
          id: msg._id.toString(),
          text: msg.text,
          sender: msg.sender,
        })));
      } else {
        client.emit('load-history', [{
          id: '1',
          text: 'Olá! Sou seu assistente jurídico. Como posso ajudar com sua questão jurídica hoje?',
          sender: 'ai',
        }]);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(@MessageBody() data: { roomId: string; message: string }) {
    const { roomId, message } = data;
    console.log(`Mensagem na sala ${roomId}: ${message}`);

    try {
      let conversation = await Conversation.findOne({ roomId });
      if (!conversation) {
        conversation = new Conversation({ roomId });
        await conversation.save();
      }

      const userMessage = new Message({
        conversationId: conversation._id,
        text: message,
        sender: 'user',
      });
      await userMessage.save();

      const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

      const aiResponseText = await this.geminiService.generateAIResponse(messages);

      const aiMessage = new Message({
        conversationId: conversation._id,
        text: aiResponseText,
        sender: 'ai',
      });
      await aiMessage.save();

      this.server.to(roomId).emit('receive-message', { text: aiResponseText, sender: 'ai' });
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      this.server.to(roomId).emit('receive-message', { text: 'Erro interno', sender: 'ai' });
    }
  }
}