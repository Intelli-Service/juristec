const io = require('socket.io-client');

console.log('🧪 Testando criação de nova conversa...');

// Conectar ao WebSocket com headers de autenticação válidos
const socket = io('http://localhost:8080', {
  transports: ['websocket'],
  timeout: 5000,
  forceNew: true
});

let connected = false;

socket.on('connect', () => {
  console.log('✅ Conectado ao WebSocket, ID:', socket.id);
  connected = true;
  
  // Primeiro, juntar-se à sala
  console.log('📋 Enviando join-room...');
  socket.emit('join-room');
  
  // Aguardar um pouco e depois tentar criar nova conversa
  setTimeout(() => {
    if (connected) {
      console.log('🆕 Testando criar nova conversa...');
      socket.emit('create-new-conversation');
    }
  }, 2000);
});

socket.on('conversations-loaded', (data) => {
  console.log('📂 Conversas carregadas:', JSON.stringify(data, null, 2));
});

socket.on('new-conversation-created', (data) => {
  console.log('🎉 Nova conversa criada:', JSON.stringify(data, null, 2));
});

socket.on('error', (error) => {
  console.error('❌ Erro WebSocket:', error);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Desconectado do WebSocket:', reason);
  connected = false;
});

// Timeout de segurança
setTimeout(() => {
  console.log('🔚 Encerrando teste...');
  socket.disconnect();
  process.exit(0);
}, 15000);