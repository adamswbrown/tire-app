// Landing page (public)

import LoginForm from "../components/LoginForm";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-2">TIREApp Web</h1>
        <p className="text-lg mb-6 text-gray-600">TIRE Framework Assessment Tool</p>
        <a
          href="/api/auth/signin"
          className="w-full mb-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition text-center"
        >
          Sign In with Microsoft
        </a>
        <div className="w-full flex items-center my-4">
          <div className="flex-grow border-t border-gray-200" />
          <span className="mx-2 text-gray-400 text-sm">or</span>
          <div className="flex-grow border-t border-gray-200" />
        </div>
        <LoginForm />
        <div className="mt-4 text-sm text-gray-500">
          Test users:<br />
          <span className="font-mono">consultant@test.com / consultant123</span><br />
          <span className="font-mono">admin@test.com / admin123</span>
        </div>
      </div>
    </main>
  );
}
