"use client";
import { useAuth } from "@/context/authContext";

export default function Home() {
  const { user, login, logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FF] text-slate-900 font-sans">

      {/* Brand Segment */}
      <h1 className="text-6xl font-extrabold mb-8 tracking-tight text-indigo-900">
        StudentOS
      </h1>

      {/* Auth Segment */}
      {!user ? (
        <button
          onClick={login}
          className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
          <p className="text-xl mb-4 font-medium text-slate-700">
            Welcome back, <span className="text-indigo-600 font-bold">{user.displayName}</span>
          </p>
          <button
            onClick={logout}
            className="text-slate-400 text-sm font-semibold hover:text-red-500 transition-colors"
          >
            Logout Session
          </button>
        </div>
      )}
    </main>
  );
}