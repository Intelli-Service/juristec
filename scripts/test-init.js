// MongoDB initialization script for tests
db = db.getSiblingDB('juristec_test');

// Create test users
db.users.insertMany([
  {
    _id: ObjectId(),
    name: "João Silva",
    email: "joao.silva@test.com",
    password: "$2b$10$hashedpasswordfortesting", // bcrypt hash for "test123"
    role: "client",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: "Maria Advogada",
    email: "maria.advogada@test.com",
    password: "$2b$10$hashedpasswordfortesting", // bcrypt hash for "test123"
    role: "lawyer",
    specialties: ["Direito Trabalhista", "Direito Civil"],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: "Admin Test",
    email: "admin@test.com",
    password: "$2b$10$hashedpasswordfortesting", // bcrypt hash for "admin123"
    role: "super_admin",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Create test AI configurations
db.aiconfigs.insertOne({
  _id: ObjectId(),
  provider: "google",
  model: "gemini-flash-lite-latest",
  apiKey: process.env.GOOGLE_API_KEY || "test-api-key",
  prompt: "Você é um assistente jurídico brasileiro...",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.conversations.createIndex({ userId: 1 });
db.conversations.createIndex({ createdAt: -1 });
db.messages.createIndex({ conversationId: 1 });
db.messages.createIndex({ createdAt: 1 });

print("Test database initialized successfully!");