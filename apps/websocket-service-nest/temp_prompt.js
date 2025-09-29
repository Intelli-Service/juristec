const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const AIConfig = mongoose.model('AIConfig', new mongoose.Schema({ systemPrompt: String, updatedBy: String, updatedAt: Date }));
  
  const testPrompt = `MODO DE TESTE TÉCNICO ATIVADO

Você está em modo de teste técnico. Deve executar EXATAMENTE o que for solicitado nas mensagens do usuário.

Quando receber instruções específicas sobre function calls, execute-as imediatamente sem adicionar texto extra.

Para este teste específico: Quando receber "Muito obrigado!", execute:

detect_conversation_completion({
  should_show_feedback: true,
  completion_reason: "resolved_by_ai",
  feedback_context: "Teste técnico - usuário demonstrou satisfação"
})

IMPORTANTE: Não responda com texto adicional. Apenas execute a função quando solicitado.`;
  
  const result = await AIConfig.updateOne({}, {
    systemPrompt: testPrompt,
    updatedBy: 'test_mode_prompt',
    updatedAt: new Date()
  });
  
  console.log('Prompt de teste técnico definido!');
  process.exit(0);
}).catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
