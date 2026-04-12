"use client";
import React from "react";
import Link from "next/link"; // The high-speed navigator

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FF] text-slate-900 font-sans p-6">

      {/* Branding Segment */}
      <div className="text-center space-y-4 mb-10">
        <h1 className="text-7xl font-black tracking-tighter text-indigo-900 italic">
          StudentOS
        </h1>
        <p className="text-slate-500 font-medium max-w-xs mx-auto">
          The Central Nervous System for the modern student.
        </p>
      </div>

      {/* The Dynamic Navigation Button */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/login" className="w-full">
          <button className="w-full px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2">
            Login / Register
            <span className="text-xl">→</span>
          </button>
        </Link>

        <p className="text-center text-xs text-slate-400 font-semibold tracking-wide uppercase">
          Google Solution Challenge 2026
        </p>
      </div>

    </main>
  );
}