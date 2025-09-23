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
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextAuthGuard } from '../guards/nextauth.guard';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';
import Conversation from '../models/Conversation';
import Message from '../models/Message';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // Allow Next.js
    methods: ['GET', 'POST'],
  },
})
@Injectable()
@UseGuards(NextAuthGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly geminiService: GeminiService,
    private readonly aiService: AIService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: Socket) {
    console.log('[DEBUG] WebSocket connection attempt - Client ID:', client.id);
    console.log('[DEBUG] Handshake auth:', client.handshake.auth);
    console.log('[DEBUG] Handshake headers:', client.handshake.headers);

    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      console.log('[DEBUG] Extracted token:', token ? 'Present' : 'Not found');

      if (!token) {
        console.log('[DEBUG] No token provided, disconnecting client:', client.id);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, { secret: process.env.NEXTAUTH_SECRET || 'fallback-secret' });
      console.log('[DEBUG] Token verified successfully, payload:', payload);

      client.data.user = payload;
      console.log('Usuário conectado:', client.id, 'User:', payload.email);
    } catch (error) {
      console.log('[DEBUG] Token verification failed for client:', client.id, 'Error:', error.message);
      client.disconnect();
    }
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
        // Criar nova conversa
        await Conversation.create({ roomId });
        // Não emitir mensagem inicial - deixar o frontend controlar a experiência
        client.emit('load-history', []);
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

      // Classificar conversa após resposta da IA
      await this.aiService.classifyConversation(roomId, messages.concat([{
        text: aiResponseText,
        sender: 'ai'
      }]));

      this.server.to(roomId).emit('receive-message', { text: aiResponseText, sender: 'ai' });
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      this.server.to(roomId).emit('receive-message', { text: 'Erro interno', sender: 'ai' });
    }
  }
}