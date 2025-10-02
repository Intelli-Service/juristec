import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: string
      permissions: string[]
      isAnonymous?: boolean
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: string
    permissions: string[]
    isAnonymous?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string
    role: string
    permissions: string[]
    isAnonymous?: boolean
  }
}