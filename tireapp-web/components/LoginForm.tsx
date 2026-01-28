"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid username or password");
    } else {
      window.location.href = "/app";
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleCredentialsLogin} className="space-y-3">
        <input
          type="text"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
      </form>

      <div className="flex items-center my-4">
        <div className="flex-grow border-t border-gray-300" />
        <span className="mx-3 text-gray-400 text-sm">or</span>
        <div className="flex-grow border-t border-gray-300" />
      </div>

      <button
        onClick={() => signIn("microsoft-entra-id")}
        className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded transition flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
        Sign in with Microsoft
      </button>
    </div>
  );
}
