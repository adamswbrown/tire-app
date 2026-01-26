// Type declarations for Auth.js (NextAuth v5) with custom role field

import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    role: string
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: string
  }
}
