import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIService } from './ai.service';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor(private aiService: AIService) {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  }

  getModel() {
    const config = this.aiService.getCurrentConfig();
    return this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: config?.systemPrompt || 'Você é um assistente útil.'
    });
  }

  async generateAIResponse(messages: { text: string; sender: string }[]): Promise<string> {
    const model = this.getModel();
    const config = this.aiService.getCurrentConfig();

    // Preparar histórico para chat session
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Iniciar chat com histórico
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: config?.behaviorSettings?.maxTokens || 1000,
        temperature: config?.behaviorSettings?.temperature || 0.7,
      },
    });

    // Última mensagem do usuário
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.text);
    return result.response.text();
  }

  // Método para atualizar o prompt do sistema (para administração)
  updateSystemPrompt(newPrompt: string) {
    // Este método agora delega para o AIService
    console.log('Use AIService.updateConfig() para atualizar o prompt do sistema');
  }

  // Método para obter o prompt atual
  getSystemPrompt(): string {
    const config = this.aiService.getCurrentConfig();
    return config?.systemPrompt || '';
  }
}