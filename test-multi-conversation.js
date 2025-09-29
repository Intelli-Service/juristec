const io = require('socket.io-client');

console.log('🧪 Testando sistema de multi-conversa...');

// Simular token JWT (pegando do cookie que seria enviado pelo frontend)
const testUserId = 'anon_05e1639efc9e167b005dbf64ad629753';

const socket = io('http://localhost:8080', {
  transports: ['websocket'],
  extraHeaders: {
    'Cookie': 'next-auth.session-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXN1w6FyaW8gQW7DtG5pbW8iLCJlbWFpbCI6ImFub25fMDVlMTYzOWVmYzllMTY3YjAwNWRiZjY0YWQ2Mjk3NTNAYW5vbnltb3VzLmp1cmlzdGVjIiwic3ViIjoiYW5vbl8wNWUxNjM5ZWZjOWUxNjdiMDA1ZGJmNjRhZDYyOTc1MyIsInJvbGUiOiJjbGllbnQiLCJwZXJtaXNzaW9ucyI6WyJhY2Nlc3Nfb3duX2NoYXQiXSwidXNlcklkIjoiYW5vbl8wNWUxNjM5ZWZjOWUxNjdiMDA1ZGJmNjRhZDYyOTc1MyIsImlzQW5vbnltb3VzIjp0cnVlLCJpYXQiOjE3NTkxMTkwMTh9.K5X7Z1wEZ2uv8O1nH7sYZJ3hQQ4vN9xL2cE8B6fT0jY'
  }
});

socket.on('connect', () => {
  console.log('✅ Conectado ao WebSocket');
  
  // Primeiro, juntar-se à sala
  console.log('📋 Enviando join-room...');
  socket.emit('join-room');
  
  setTimeout(() => {
    console.log('🆕 Testando criar nova conversa...');
    socket.emit('create-new-conversation');
  }, 2000);
});

socket.on('conversations-loaded', (data) => {
  console.log('📂 Conversas carregadas:', data);
});

socket.on('new-conversation-created', (data) => {
  console.log('🎉 Nova conversa criada:', data);
});

socket.on('conversation-switched', (data) => {
  console.log('🔄 Conversa trocada:', data);
});

socket.on('load-history', (history) => {
  console.log('📜 Histórico carregado:', history.length, 'mensagens');
});

socket.on('error', (error) => {
  console.error('❌ Erro:', error);
});

socket.on('disconnect', () => {
  console.log('❌ Desconectado do WebSocket');
});

// Fechar após 10 segundos
setTimeout(() => {
  console.log('🔚 Encerrando teste...');
  socket.disconnect();
  process.exit(0);
}, 10000);