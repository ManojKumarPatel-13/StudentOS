"use client";
import { useAuth } from "@/context/authContext";

export default function Home() {
  const { user, login, logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#020617] text-white">
      <h1 className="text-5xl font-bold mb-8">StudentOS</h1>

      {!user ? (
        <button
          onClick={login}
          className="px-8 py-4 bg-blue-600 rounded-full font-bold hover:bg-blue-500 transition-all"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="text-center">
          <p className="text-xl mb-4">Logged in as: {user.displayName}</p>
          <button
            onClick={logout}
            className="text-slate-400 underline"
          >
            Logout
          </button>
        </div>
      )}
    </main>
  );
}