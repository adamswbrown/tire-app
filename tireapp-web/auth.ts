// Auth.js (NextAuth v5) configuration for TIREApp
// Source: M1-ResearchPack.md (Auth.js v5 with Entra ID)

import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Database session strategy required for PrismaAdapter
  session: { strategy: "database" },

  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,

      // Extract role from Entra ID profile
      profile(profile) {
        // Check for 'roles' claim from Entra ID app roles
        // Fallback to "Consultant" if no role assigned
        const role = profile.roles?.[0] ?? "Consultant"

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          role: role, // "Consultant" or "Admin"
        }
      },
    }),
  ],

  callbacks: {
    // Persist role in JWT token
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },

    // Add role to session object
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
      }
      return session
    },
  },

  pages: {
    signIn: '/api/auth/signin',
    error: '/api/auth/error',
  },
})
