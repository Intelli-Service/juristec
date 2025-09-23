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
    name: 'Advogado Demo',
    email: 'lawyer@demo.com', 
    password: 'lawyer123',
    role: 'lawyer'
  },
  {
    name: 'Moderador Demo',
    email: 'moderator@demo.com',
    password: 'moderator123', 
    role: 'moderator'
  }
]

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

seedUsers()