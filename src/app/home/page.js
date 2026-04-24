"use client";
import React, { useState, useEffect } from "react";
import { Search, Plus, CheckCircle2 } from "lucide-react";
import Sidebar from "@/components/shared/sidebar"; // Integrating your existing sidebar
import { useAuth } from "@/context/authContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function HomePage() {
    const { user } = useAuth();
    const uid = user?.uid;

    const [tasks, setTasks] = useState([]);
    const [dayProgress, setDayProgress] = useState(0);
    const [outlook, setOutlook] = useState({ percent: 0, greeting: "Astra is preparing your mission..." });

    useEffect(() => {
        const calc = () => {
            const now = new Date();
            const start = new Date().setHours(6, 0, 0, 0);
            const end = new Date().setHours(24, 0, 0, 0);
            const percent = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
            setDayProgress(percent);
        };
        calc();
        const interval = setInterval(calc, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!uid) return;
        const today = new Date().toISOString().split("T")[0];
        const q = query(collection(db, "users", uid, "tasks"), where("date", "==", today));

        return onSnapshot(q, (snapshot) => {
            const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const completed = allTasks.filter(t => t.completed).length;
            const percent = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;

            setTasks(allTasks);
            setOutlook({
                percent,
                greeting: percent >= dayProgress
                    ? `Good morning, ${user?.displayName?.split(" ")[0]}. You're outpacing the day—keep this momentum.`
                    : `Good morning, ${user?.displayName?.split(" ")[0]}. The day is moving fast; let's tackle your goals.`
            });
        });
    }, [uid, dayProgress]);

    return (
        <div className="flex min-h-screen bg-[#0A1628] text-white">
            <style>{`
        @keyframes textShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes progressGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(24, 95, 165, 0.3); }
          50% { box-shadow: 0 0 25px rgba(201, 168, 76, 0.4); }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, #FFFFFF, #185FA5, #C9A84C, #FFFFFF);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShimmer 4s linear infinite;
        }
        .progress-liquid {
          background: linear-gradient(90deg, #185FA5, #C9A84C);
          position: relative;
          overflow: hidden;
        }
        .progress-liquid::after {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: translateX(-100%);
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

            {/* --- INTEGRATED SIDEBAR --- */}
            <Sidebar />

            {/* --- MAIN CONTENT (Adjusted for Sidebar width) --- */}
            <main className="flex-1 ml-64 flex flex-col min-w-0">

                {/* HEADER: Date on left, Command & Add Task grouped on right */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-10">

                    {/* Date and Day (Anchored Left) */}
                    <div className="text-[11px] font-mono text-white/40 tracking-[0.2em] uppercase whitespace-nowrap">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>

                    {/* Right Group: Command Box and Add Task */}
                    <div className="flex items-center gap-6">
                        {/* Command Box */}
                        <div className="w-[400px] relative">
                            <input
                                className="w-full bg-[#0C2D5E]/30 border border-white/10 rounded-full py-2.5 px-12 text-sm outline-none focus:border-[#C9A84C]/50 transition-all placeholder:text-white/20 font-medium"
                                placeholder="Search or issue command..."
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        </div>

                        {/* Add Task Button */}
                        <button className="flex items-center gap-2 bg-[#185FA5] hover:bg-blue-600 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 whitespace-nowrap">
                            <Plus size={16} /> Add Task
                        </button>
                    </div>
                </header>

                <div className="p-12 space-y-10 overflow-y-auto">

                    {/* ASTRA GREETING: Enhanced colors and shimmer */}
                    <section className="max-w-5xl">
                        <h1 className="text-5xl font-black tracking-tighter leading-[1.1] animate-shimmer drop-shadow-sm">
                            {outlook.greeting}
                        </h1>
                    </section>

                    {/* OVERVIEW: Task completion and Day progress cards per sketch */}
                    <section className="bg-[#0C2D5E]/20 border border-white/5 rounded-[48px] p-10 backdrop-blur-3xl shadow-inner shadow-white/5">
                        <div className="space-y-10">
                            {/* Task Completion Bar: Enhanced Gradient and Glow */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 font-mono">Neural Outlook</span>
                                        <h3 className="text-xl font-bold">Task Completion</h3>
                                    </div>
                                    <span className="text-3xl font-mono font-black text-[#C9A84C]">{outlook.percent}%</span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                    <div
                                        className="h-full progress-liquid transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${outlook.percent}%`,
                                            animation: 'progressGlow 3s infinite'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Day Progress: Subtler to contrast tasks */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end text-white/30">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">Chronos Status</span>
                                    <span className="text-xl font-mono font-bold tracking-tighter">{dayProgress}% day elapsed</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white/20 transition-all duration-1000 ease-out"
                                        style={{ width: `${dayProgress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* --- LOWER BENTO GRID --- */}
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_2fr] gap-10">

                        {/* FOCUS SESSION MODULE */}
                        <section className="bg-[#0C2D5E]/20 border border-white/5 rounded-[48px] p-8 backdrop-blur-3xl flex flex-col items-center justify-between min-h-[450px]">
                            <div className="w-full">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 font-mono">Neural Focus</span>
                                <h3 className="text-xl font-bold mt-1">Focus Session</h3>
                            </div>

                            {/* The Focus Vial / Timer UI */}
                            <div className="relative w-32 h-56 bg-white/5 border-2 border-white/10 rounded-full overflow-hidden flex flex-col justify-end">
                                {/* Animated Liquid Fill (Adjust height based on timer) */}
                                <div
                                    className="w-full bg-gradient-to-t from-[#185FA5] to-[#C9A84C] transition-all duration-1000 ease-linear shadow-[0_0_30px_rgba(24,95,165,0.4)]"
                                    style={{ height: `45%` }} // We'll link this to timer logic later
                                >
                                    <div className="w-full h-4 bg-white/20 animate-pulse" />
                                </div>

                                {/* Timer Text overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black font-mono tracking-tighter">25:00</span>
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Deep Work</span>
                                </div>
                            </div>

                            <div className="w-full space-y-3">
                                <button className="w-full py-4 bg-[#185FA5] hover:bg-blue-600 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/20">
                                    Initialize Focus
                                </button>
                                <p className="text-center text-[10px] text-white/20 font-mono italic">Astra is monitoring biological focus markers...</p>
                            </div>
                        </section>

                        {/* TASKS DONE MODULE */}
                        <section className="bg-[#0C2D5E]/20 border border-white/5 rounded-[48px] p-8 backdrop-blur-3xl flex flex-col min-h-[450px]">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 font-mono">Archive Feed</span>
                                    <h3 className="text-xl font-bold mt-1">Tasks Done</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black font-mono text-[#C9A84C]">08</span>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Completed Today</p>
                                </div>
                            </div>

                            {/* Scrollable Tasks List */}
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                {/* Example Task Row */}
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/[0.08] transition-all group">
                                        <div className="w-6 h-6 rounded-full border-2 border-emerald-500 bg-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white/80 line-through decoration-white/20">Advanced Calculus Review</p>
                                            <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1">Physics Module • 45m focused</p>
                                        </div>
                                        <span className="text-[10px] font-mono text-white/20">14:20</span>
                                    </div>
                                ))}

                                {/* If no tasks are done */}
                                <div className="hidden h-full flex flex-col items-center justify-center opacity-20">
                                    <div className="w-12 h-12 border-2 border-dashed border-white rounded-full mb-4" />
                                    <p className="text-[10px] font-mono uppercase tracking-[0.3em]">No data archived yet</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* --- SEPARATED MASTERY & LOG CARDS --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-stretch">

                        {/* CARD 1: SUBJECT MASTERY */}
                        <section className="bg-[#0C2D5E]/20 border border-white/5 rounded-[48px] p-10 backdrop-blur-3xl shadow-xl flex flex-col justify-center">
                            <div className="mb-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 font-mono">Neural Retention</span>
                                <h3 className="text-xl font-bold mt-1">Subject Mastery</h3>
                            </div>

                            <div className="space-y-8">
                                {[
                                    { sub: "Mathematics", color: "#185FA5", percent: 62 },
                                    { sub: "Science", color: "#C9A84C", percent: 85 },
                                    { sub: "Coding", color: "#10b981", percent: 94 },
                                    { sub: "Subject 4", color: "#8b5cf6", percent: 40 }
                                ].map((item, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between items-center mb-3 px-1">
                                            <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors tracking-tight">
                                                {item.sub}
                                            </span>
                                            <span className="text-xs font-mono font-black text-white/40">{item.percent}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full transition-all duration-1000 ease-out rounded-full"
                                                style={{
                                                    width: `${item.percent}%`,
                                                    backgroundColor: item.color,
                                                    boxShadow: `0 0 15px ${item.color}33`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* CARD 2: ASTRA LOG (Stand-alone Terminal) */}
                        <section className="bg-[#060D1A]/60 border border-white/10 rounded-[48px] p-8 flex flex-col shadow-2xl backdrop-blur-md">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#C9A84C]">Astra Log</h3>
                                    <p className="text-[9px] text-white/20 font-mono uppercase mt-1 tracking-widest">Active Link</p>
                                </div>
                                <div className="w-2.5 h-2.5 bg-[#C9A84C] rounded-full animate-pulse shadow-[0_0_10px_#C9A84C]" />
                            </div>

                            <div className="flex-1 font-mono text-[11px] space-y-6">
                                <div className="flex gap-4">
                                    <span className="text-[#185FA5] opacity-50 font-bold">11:42</span>
                                    <span className="text-white/50 italic leading-relaxed">Neural Link stable.</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-[#185FA5] opacity-50 font-bold">12:15</span>
                                    <span className="text-white/50 leading-relaxed">Focus session logged: Physics.</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-[#C9A84C] font-bold">13:02</span>
                                    <span className="text-[#C9A84C]/80 font-bold underline decoration-dotted underline-offset-8">
                                        Retention Alert: Science.
                                    </span>
                                </div>
                                <div className="flex gap-4 animate-pulse">
                                    <span className="text-white/10 tracking-tighter">_Listening...</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-mono opacity-20 uppercase tracking-[0.3em]">
                                <span>System v3.1</span>
                                <div className="flex gap-1.5">
                                    <div className="w-1 h-1 bg-white rounded-full" />
                                    <div className="w-1 h-1 bg-white rounded-full opacity-50" />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* --- FINAL INPUT LAYER --- */}
                    <div className="grid grid-cols-1 gap-10">

                        {/* NEURAL SNAP: EXPANDED BRAIN DUMP */}
                        <section className="bg-[#0C2D5E]/20 border border-white/5 rounded-[48px] p-10 backdrop-blur-3xl flex flex-col min-h-[350px] group">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C9A84C] font-mono">Neural Interface</span>
                                    <h3 className="text-2xl font-bold mt-1">Neural Snap — Brain Dump</h3>
                                    <p className="text-white/30 text-xs mt-2 font-medium">Capture fleeting thoughts, lecture points, or messy ideas without leaving your flow.</p>
                                </div>
                                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Live Sync</span>
                                </div>
                            </div>

                            {/* Expanded Text Area */}
                            <textarea
                                className="flex-1 bg-[#060D1A]/40 border border-white/10 rounded-[32px] p-8 text-lg text-white/80 outline-none focus:border-[#185FA5]/50 transition-all resize-none font-medium leading-relaxed placeholder:text-white/5"
                                placeholder="Start typing your thoughts..."
                            />

                            <div className="mt-6 flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
                                <span>Astra Neural Archive v1.0</span>
                                <span className="italic text-[#C9A84C]/40">Intelligence is the byproduct of organized chaos.</span>
                            </div>
                        </section>
                    </div>

                </div>
            </main>
        </div>
    );
}