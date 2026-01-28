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

  // JWT strategy is required for CredentialsProvider to work properly
  // Database strategy doesn't work with credentials because the adapter
  // expects OAuth callback flow for session creation
  session: { strategy: "jwt" },

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
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!username || !password) {
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email: username } });
        if (!user || !user.password) {
          return null;
        }
        const valid = bcrypt.compareSync(password, user.password);
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
    // Block sign-in if user not provisioned (for OAuth providers)
    async signIn({ user, account }) {
      // Credentials already validated in authorize - user must exist
      if (account?.provider === "credentials") {
        return true
      }

      // For OAuth (Entra), check if user email is pre-provisioned
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (!existingUser) {
          // Redirect to unauthorized with error
          return "/unauthorized?error=not_provisioned"
        }
      }
      return true
    },

    // JWT callback - add user data to token
    async jwt({ token, user, account }) {
      if (user) {
        // For OAuth, get the role from the database since profile may not have it
        if (account?.provider !== "credentials" && user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true },
          })
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
          }
        } else {
          token.id = user.id
          token.role = (user as { role?: string }).role ?? "Consultant"
        }
      }
      return token
    },

    // Session callback - expose token data to client
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },

  pages: {
    signIn: '/',
    error: '/api/auth/error',
  },
})
