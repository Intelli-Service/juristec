import { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Extender tipos do NextAuth
declare module 'next-auth' {
  interface User {
    isAnonymous?: boolean
  }
  interface Session {
    user: {
      id: string
      role: string
      permissions: string[]
      isAnonymous?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isAnonymous?: boolean
  }
}

// MongoDB client for NextAuth adapter
const client = new MongoClient(process.env.MONGODB_URI!)

// Interface para o usuário autenticado
interface AuthUser {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'lawyer' | 'moderator' | 'client'
  permissions: string[]
  isAnonymous?: boolean
}

export const authOptions: NextAuthOptions = {
  // adapter: MongoDBAdapter(client), // Temporariamente removido para testar JWT puro
  providers: [
    // Provider anônimo - sempre permite login
    {
      id: 'anonymous',
      name: 'Anonymous',
      type: 'credentials',
      credentials: {},
      async authorize() {
        // Sempre cria um usuário anônimo
        const anonymousId = `anon_${crypto.randomBytes(16).toString('hex')}`;
        return {
          id: anonymousId,
          email: `${anonymousId}@anonymous.juristec`,
          name: 'Usuário Anônimo',
          role: 'client',
          permissions: ['access_own_chat'],
          isAnonymous: true,
        };
      },
    },
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Conectar ao MongoDB diretamente para validar credenciais
          await client.connect()
          const db = client.db()
          const user = await db.collection('users').findOne({ 
            email: credentials.email 
          })

          if (!user) {
            return null
          }

          // Verificar senha
          const isValidPassword = await bcrypt.compare(
            credentials.password, 
            user.password
          )

          if (!isValidPassword) {
            return null
          }

          // Definir permissões baseadas no role
          const getPermissions = (role: string) => {
            switch (role) {
              case 'super_admin':
                return [
                  'manage_ai_config',
                  'view_all_cases',
                  'assign_cases',
                  'moderate_conversations',
                  'access_client_chat',
                  'generate_reports',
                  'manage_users'
                ]
              case 'lawyer':
                return [
                  'view_available_cases',
                  'assign_cases_to_self',
                  'access_assigned_chats',
                  'update_case_status'
                ]
              case 'moderator':
                return [
                  'view_all_cases',
                  'moderate_conversations',
                  'flag_inappropriate_content'
                ]
              case 'client':
                return ['access_own_chat']
              default:
                return []
            }
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: getPermissions(user.role)
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
    // Forçar JWT puro em vez de JWE
    encode: async ({ secret, token }) => {
      if (!token) throw new Error('Token is required')
      return jwt.sign(token, secret)
    },
    decode: async ({ secret, token }) => {
      if (!token) return null
      try {
        return jwt.verify(token, secret) as JWT
      } catch {
        return null
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      // Se não há token e não há user, criar usuário anônimo automaticamente
      if (!token.userId && !user) {
        const anonymousId = `anon_${crypto.randomBytes(16).toString('hex')}`;
        token.userId = anonymousId;
        token.role = 'client';
        token.permissions = ['access_own_chat'];
        token.isAnonymous = true;
        token.email = `${anonymousId}@anonymous.juristec`;
        token.name = 'Usuário Anônimo';
      }
      
      // Incluir dados do usuário no token JWT
      if (user) {
        token.role = user.role
        token.permissions = user.permissions
        token.userId = user.id
        token.isAnonymous = user.isAnonymous || false
      }
      return token
    },
    async session({ session, token }) {
      // Incluir dados do token na sessão
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
        session.user.permissions = token.permissions as string[]
        session.user.isAnonymous = token.isAnonymous as boolean
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
}

// Função helper para verificar permissões
export const hasPermission = (
  userPermissions: string[], 
  requiredPermission: string
): boolean => {
  return userPermissions.includes(requiredPermission)
}

// Função helper para verificar role
export const hasRole = (
  userRole: string, 
  requiredRoles: string | string[]
): boolean => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  return roles.includes(userRole)
}