import { Schema, model, Document } from 'mongoose';

export interface IAIConfig extends Document {
  _id: string;
  systemPrompt: string;
  behaviorSettings: {
    maxTokens: number;
    temperature: number;
    ethicalGuidelines: string[];
    specializationAreas: string[];
  };
  classificationSettings: {
    enabled: boolean;
    categories: string[];
    summaryTemplate: string;
  };
  updatedBy: string;
  updatedAt: Date;
  createdAt: Date;
}

const AIConfigSchema = new Schema<IAIConfig>({
  systemPrompt: {
    type: String,
    required: true,
    default: `Você é um assistente jurídico brasileiro altamente qualificado e ético...`,
  },
  behaviorSettings: {
    maxTokens: { type: Number, default: 1000 },
    temperature: { type: Number, default: 0.7 },
    ethicalGuidelines: [{ type: String }],
    specializationAreas: [{ type: String }],
  },
  classificationSettings: {
    enabled: { type: Boolean, default: true },
    categories: [{ type: String }],
    summaryTemplate: {
      type: String,
      default: 'Resumo do caso: [categoria] - [complexidade]',
    },
  },
  updatedBy: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export default model<IAIConfig>('AIConfig', AIConfigSchema);
