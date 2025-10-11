import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not found in environment variables')
}

const users = [
  {
    name: 'Super Admin',
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'super_admin'
  },
  {
    name: 'Dr. João Silva',
    email: 'lawyer@demo.com', 
    password: 'lawyer123',
    role: 'lawyer',
    profile: {
      specialization: ['Direito Civil', 'Direito Trabalhista'],
      licenseNumber: '123456/SP',
      bio: 'Advogado especialista em Direito Civil e Trabalhista com mais de 10 anos de experiência.'
    }
  },
  {
    name: 'Moderador Demo',
    email: 'moderator@demo.com',
    password: 'moderator123', 
    role: 'moderator'
  }
]

const aiConfig = {
  systemPrompt: 'Você é um assistente jurídico brasileiro. Sua principal função é realizar uma triagem inicial de casos, coletando informações essenciais do usuário de forma natural e conversacional. Com base nos dados, você deve classificar o caso, avaliar sua complexidade e, se necessário, encaminhá-lo para um advogado especialista. Use as funções disponíveis para registrar novos usuários e atualizar o status da conversa quando a coleta de dados for concluída.',
  behaviorSettings: {
    maxTokens: 2048,
    temperature: 0.7,
    ethicalGuidelines: [
      'Sempre manter confidencialidade',
      'Não dar aconselhamento jurídico definitivo',
      'Orientar sobre direitos básicos apenas',
      'Encaminhar casos complexos para advogados'
    ],
    specializationAreas: [
      'Direito Civil',
      'Direito Trabalhista',
      'Direito Empresarial',
      'Direito Penal',
      'Direito Previdenciário',
      'Direito Tributário'
    ]
  },
  classificationSettings: {
    enabled: true,
    categories: [
      'Direito Civil',
      'Direito Trabalhista',
      'Direito Penal',
      'Direito Empresarial',
      'Direito Previdenciário',
      'Direito Tributário',
      'Direito Família',
      'Direito Consumidor'
    ],
    summaryTemplate: 'Caso [categoria]: [complexidade] - [urgência]'
  },
  updatedBy: 'system-seed',
  updatedAt: new Date(),
  createdAt: new Date()
}

async function seedUsers() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db()
    const collection = db.collection('users')
    
    // Clear existing demo users
    await collection.deleteMany({
      email: { $in: users.map(u => u.email) }
    })
    
    // Hash passwords and insert users
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 12)
      
      await collection.insertOne({
        ...user,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      console.log(`✓ Created user: ${user.email} (${user.role})`)
    }
    
    console.log('\n🎉 Database seeded successfully!')
    console.log('\nLogin credentials:')
    users.forEach(user => {
      console.log(`${user.role}: ${user.email} / ${user.password}`)
    })
    
  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await client.close()
  }
}

async function seedAIConfig() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db()
    const collection = db.collection('aiconfigs')
    
    // Clear existing AI config
    await collection.deleteMany({})
    
    // Insert AI configuration
    await collection.insertOne(aiConfig)
    
    console.log('✓ Created AI configuration')
    console.log('  - System prompt configured')
    console.log('  - Behavior settings applied')
    console.log('  - Classification settings enabled')
    
  } catch (error) {
    console.error('Error seeding AI configuration:', error)
  } finally {
    await client.close()
  }
}

async function main() {
  console.log('🌱 Starting database seeding...\n')
  
  await seedUsers()
  console.log('')
  await seedAIConfig()
  
  console.log('\n🎉 All seeding completed successfully!')
  console.log('\nNext steps:')
  console.log('1. Start the application with: docker-compose up --build')
  console.log('2. Access the platform at: http://localhost:8080')
  console.log('3. Login with admin credentials to configure the system')
}

main()