
"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 320, margin: "2rem auto", textAlign: "center" }}>
      <h2>Login</h2>
      <button
        onClick={() => signIn("microsoft-entra-id")}
        style={{ width: "100%", padding: 12, fontSize: 16 }}
      >
        Sign in with Microsoft
      </button>
    </div>
  );
}
