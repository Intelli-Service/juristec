import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: string
      permissions: string[]
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: string
    permissions: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string
    role: string
    permissions: string[]
  }
}