// Auth.js (NextAuth v5) configuration for TIREApp
// Source: M1-ResearchPack.md (Auth.js v5 with Entra ID)


import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Database session strategy required for PrismaAdapter
  session: { strategy: "database" },

  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
      profile(profile) {
        const role = profile.roles?.[0] ?? "Consultant"
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          role: role,
        }
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email: credentials.username } });
        if (!user || !user.password) {
          return null;
        }
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          return null;
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // Add role to session object (database strategy provides user, not token)
    session({ session, user }) {
      if (session.user && user) {
        session.user.role = (user as { role?: string }).role ?? "Consultant"
      }
      return session
    },
  },

  pages: {
    signIn: '/api/auth/signin',
    error: '/api/auth/error',
  },
})
