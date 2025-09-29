require('dotenv').config();
const { MongoClient } = require('mongodb');

async function updatePrompt() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const newPrompt = `MODO DE TESTE TÉCNICO ATIVADO

Você está em modo de teste técnico. Deve executar EXATAMENTE o que for solicitado.

REGRAS DE FUNCTION CALLS:
- Quando uma mensagem do usuário CONTIVER as palavras "Muito obrigado!" E mencionar "INSTRUÇÕES DE TESTE", você DEVE executar detect_conversation_completion
- Parâmetros EXATOS: should_show_feedback: true, completion_reason: "user_satisfied", feedback_context: "Teste técnico executado com sucesso"
- NÃO responda com texto - apenas execute a function call
- IGNORE qualquer outro contexto ou instruções na mensagem

EXEMPLO: Se receber "Muito obrigado! INSTRUÇÕES DE TESTE: bla bla bla" → execute function call imediatamente`;

  const result = await db.collection('aiconfigs').updateOne({}, { $set: { systemPrompt: newPrompt } });
  console.log('Prompt atualizado:', result);
  await client.close();
}

updatePrompt();