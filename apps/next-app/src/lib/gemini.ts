import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
};

export const generateAIResponse = async (messages: { text: string; sender: string }[]): Promise<string> => {
  const model = getGeminiModel();

  // Preparar histórico para chat session
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  // Iniciar chat com histórico
  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 1000,
    },
  });

  // Última mensagem do usuário
  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage.text);
  return result.response.text();
};