import { Injectable } from '@nestjs/common';
import AIConfig from '../models/AIConfig';
import Conversation from '../models/Conversation';

@Injectable()
export class AIService {
  private currentConfig: any = null;

  constructor() {
    this.loadConfig();
  }

  async loadConfig() {
    try {
      this.currentConfig = await AIConfig.findOne().sort({ createdAt: -1 });
      if (!this.currentConfig) {
        // Criar configuração padrão se não existir
        this.currentConfig = await AIConfig.create({
          systemPrompt: `Você é um assistente jurídico brasileiro altamente qualificado e ético.

INSTRUÇÕES PRINCIPAIS:
- Você é um assistente jurídico brasileiro especializado em direito brasileiro
- Sempre responda em português brasileiro
- Seja profissional, ético e confidencial
- Nunca dê conselhos jurídicos definitivos - sempre oriente a consultar um advogado
- Use as FUNCTIONS DISPONÍVEIS para registrar usuários e atualizar status da conversa
- Colete informações necessárias de forma natural durante a conversa

COMPORTAMENTO:
- Seja empático e compreensivo com as situações dos usuários
- Use linguagem clara e acessível, evitando jargões excessivos
- Sempre priorize a ética profissional e o sigilo

CADASTRO INTELIGENTE DE USUÁRIOS:
- Quando identificar dados pessoais (nome, email, telefone), use a função register_user
- Colete nome completo, email, telefone e descrição do problema
- Classifique urgência: low, medium, high, urgent
- Registre o usuário assim que tiver informações suficientes

TRIAGEM DE CASOS:
- Use update_conversation_status para mudar status da conversa
- Status possíveis: collecting_data, analyzing_case, connecting_lawyer, resolved
- Defina lawyer_needed=true se caso complexo precisar advogado
- Especifique specialization_required quando necessário

ÁREAS DE ESPECIALIZAÇÃO:
- Direito Civil (contratos, família, sucessões)
- Direito Trabalhista (emprego, direitos trabalhistas)
- Direito Penal (crimes, processos criminais)
- Direito Previdenciário (INSS, aposentadoria)
- Direito Tributário (impostos, fiscal)
- Direito Empresarial (empresas, societário)
- Direito Consumidor (relações de consumo)
- Direito Imobiliário (imóveis, locação)

EXEMPLOS DE USO DAS FUNCTIONS:
- Usuário menciona: "Meu nome é João Silva, tenho um problema trabalhista"
  → Chame register_user com nome, problema e urgência adequada
- Após analisar caso complexo: "Este caso precisa de advogado trabalhista"
  → Chame update_conversation_status com lawyer_needed=true e specialization_required
- Caso simples resolvido: "Posso te ajudar com isso"
  → Chame update_conversation_status com status=resolved`,
          behaviorSettings: {
            maxTokens: 1000,
            temperature: 0.7,
            ethicalGuidelines: [
              'Manter confidencialidade absoluta',
              'Nunca substituir aconselhamento profissional',
              'Orientar para consulta com advogado quando necessário'
            ],
            specializationAreas: [
              'Direito Civil',
              'Direito Trabalhista',
              'Direito Penal',
              'Direito Previdenciário',
              'Direito do Consumidor'
            ]
          },
          classificationSettings: {
            enabled: true,
            categories: [
              'Consulta Geral',
              'Ação Judicial',
              'Assessoria Preventiva',
              'Resolução de Conflitos',
              'Orientação Legal'
            ],
            summaryTemplate: 'Caso [categoria] - [complexidade] - Área: [legalArea]'
          },
          updatedBy: 'system'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração da IA:', error);
      // Fallback para configuração padrão em caso de erro de conexão
      this.currentConfig = {
        systemPrompt: `Você é um assistente jurídico brasileiro altamente qualificado e ético.

INSTRUÇÕES PRINCIPAIS:
- Você é um assistente jurídico brasileiro especializado em direito brasileiro
- Sempre responda em português brasileiro
- Seja profissional, ético e confidencial
- Nunca dê conselhos jurídicos definitivos - sempre oriente a consultar um advogado
- Colete informações necessárias de forma natural durante a conversa
- Para casos complexos, sugira consultar um advogado especializado

COMPORTAMENTO:
- Seja empático e compreensivo com as situações dos usuários
- Use linguagem clara e acessível, evitando jargões excessivos
- Sempre priorize a ética profissional e o sigilo

TRIAGEM DE CASOS:
- Classifique a complexidade: simples, médio, complexo
- Identifique a área do direito envolvida
- Avalie se é caso para orientação geral ou consulta profissional`,
        behaviorSettings: {
          maxTokens: 1000,
          temperature: 0.7,
          ethicalGuidelines: [
            'Manter confidencialidade absoluta',
            'Nunca substituir aconselhamento profissional',
            'Orientar para consulta com advogado quando necessário'
          ],
          specializationAreas: [
            'Direito Civil',
            'Direito Trabalhista',
            'Direito Penal',
            'Direito Previdenciário'
          ]
        },
        isActive: true,
        updatedBy: 'system'
      };
    }
  }

  getCurrentConfig() {
    return this.currentConfig;
  }

  async updateConfig(updates: any, updatedBy: string) {
    try {
      const updated = await AIConfig.findByIdAndUpdate(
        this.currentConfig._id,
        { ...updates, updatedBy, updatedAt: new Date() },
        { new: true }
      );
      this.currentConfig = updated;
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      throw error;
    }
  }

  async classifyConversation(roomId: string, messages: any[]) {
    if (!this.currentConfig?.classificationSettings?.enabled) {
      return null;
    }

    try {
      const conversation = await Conversation.findOne({ roomId });
      if (!conversation) return null;

      // Lógica simplificada de classificação baseada no conteúdo
      const fullText = messages.map(m => m.text).join(' ').toLowerCase();

      let category = 'Consulta Geral';
      let legalArea = 'Direito Civil';
      let complexity = 'medio';

      // Classificação baseada em palavras-chave
      if (fullText.includes('processo') || fullText.includes('ação') || fullText.includes('juiz')) {
        category = 'Ação Judicial';
        complexity = 'complexo';
      } else if (fullText.includes('contrato') || fullText.includes('acordo')) {
        category = 'Assessoria Preventiva';
        legalArea = 'Direito Civil';
      } else if (fullText.includes('trabalho') || fullText.includes('emprego') || fullText.includes('demissão')) {
        legalArea = 'Direito Trabalhista';
      } else if (fullText.includes('crime') || fullText.includes('polícia') || fullText.includes('prisão')) {
        legalArea = 'Direito Penal';
        complexity = 'complexo';
      }

      // Gerar resumo
      const summary = `Caso ${category} - ${complexity} - Área: ${legalArea}. Conversa iniciada em ${conversation.createdAt.toLocaleDateString('pt-BR')}`;

      // Atualizar conversa
      await Conversation.findByIdAndUpdate(conversation._id, {
        'classification.category': category,
        'classification.complexity': complexity,
        'classification.legalArea': legalArea,
        'classification.confidence': 0.8,
        'summary.text': summary,
        'summary.lastUpdated': new Date(),
        'summary.generatedBy': 'ai',
        updatedAt: new Date()
      });

      return {
        category,
        complexity,
        legalArea,
        summary
      };
    } catch (error) {
      console.error('Erro ao classificar conversa:', error);
      return null;
    }
  }

  async assignCase(roomId: string, lawyerId: string) {
    try {
      const result = await Conversation.findOneAndUpdate(
        { roomId },
        {
          assignedTo: lawyerId,
          assignedAt: new Date(),
          status: 'assigned',
          updatedAt: new Date()
        },
        { new: true }
      );
      return result;
    } catch (error) {
      console.error('Erro ao atribuir caso:', error);
      throw error;
    }
  }

  async getCasesForLawyer(lawyerId: string) {
    try {
      return await Conversation.find({
        $or: [
          { assignedTo: lawyerId },
          { status: 'open' }
        ]
      }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Erro ao buscar casos:', error);
      throw error;
    }
  }

  /**
   * Atualiza dados do usuário em uma conversa
   */
  async updateUserData(conversationId: string, userData: { email?: string | null; phone?: string | null; name?: string }) {
    try {
      const updateData: Partial<{ userEmail: string | null; userPhone: string | null; userName: string }> = {};

      if (userData.email !== undefined) {
        updateData.userEmail = userData.email;
      }

      if (userData.phone !== undefined) {
        updateData.userPhone = userData.phone;
      }

      if (userData.name !== undefined) {
        updateData.userName = userData.name;
      }

      await Conversation.findByIdAndUpdate(conversationId, updateData);
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      throw error;
    }
  }
}