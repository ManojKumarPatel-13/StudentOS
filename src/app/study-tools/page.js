"use client";

import Sidebar from "@/components/shared/sidebar";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MessageSquare, FileText, Zap, Clock, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { getToolsActivity } from "@/lib/services/toolsService";

const TOOLS = [
  {
    id: "ai",
    title: "AI Assistant",
    desc: "Ask anything academic. Powered by Gemini — explains concepts, solves problems, and builds your understanding step by step.",
    btn: "Start Chat",
    path: "/study-tools/ai",
    icon: <MessageSquare size={22} />,
    accent: "#185FA5",
    glow: "rgba(24,95,165,0.15)",
    border: "rgba(24,95,165,0.3)",
    tag: "Gemini Powered",
  },
  {
    id: "note",
    title: "Notes Generator",
    desc: "Transform any topic into clean, structured, exam-ready notes instantly. Supports text input, image upload, and PDF parsing.",
    btn: "Generate Notes",
    path: "/study-tools/note",
    icon: <FileText size={22} />,
    accent: "#C9A84C",
    glow: "rgba(201,168,76,0.12)",
    border: "rgba(201,168,76,0.3)",
    tag: "AI Generated",
  },
  {
    id: "quiz",
    title: "Quiz Generator",
    desc: "Create custom quizzes on any subject. Choose difficulty and question count, then test yourself with an interactive timer-based interface.",
    btn: "Generate Quiz",
    path: "/study-tools/quiz",
    icon: <Zap size={22} />,
    accent: "#10B981",
    glow: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    tag: "Interactive",
  },
];

export default function StudyTools() {
  const router = useRouter();
  const { user } = useAuth();
  const [activity, setActivity] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    getToolsActivity(user.uid).then(setActivity);
  }, [user]);

  const filtered = TOOLS.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#0A1628] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                @keyframes pulseDot { 0%,100%{transform:scale(1)} 50%{transform:scale(0.7)} }
                .tool-card { transition: all 0.2s ease; }
                .tool-card:hover { transform: translateY(-3px); }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(24,95,165,0.3); border-radius: 2px; }
            `}</style>

      {/* Ambient glows */}
      <div className="fixed pointer-events-none z-0" style={{ top: -100, left: 300, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(24,95,165,0.06) 0%, transparent 65%)" }} />
      <div className="fixed pointer-events-none z-0" style={{ bottom: -100, right: 100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 65%)" }} />

      <Sidebar activePage="tools" />

      <main className="flex-1 ml-64 p-10 relative z-10">

        {/* Header */}
        <div className="mb-10" style={{ animation: "fadeUp 0.4s ease both" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #185FA5, #0C2D5E)", border: "1px solid rgba(24,95,165,0.4)" }}>
              <Sparkles size={14} color="#C9A84C" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30">Neural Toolkit</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Study Tools</h1>
          <p className="text-white/40 mt-2 text-sm">AI-powered tools to accelerate your learning</p>
        </div>

        {/* Search */}
        <div className="mb-8" style={{ animation: "fadeUp 0.4s 0.05s ease both" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full max-w-sm px-5 py-3 rounded-2xl text-sm outline-none transition-all placeholder:text-white/20"
            style={{ background: "rgba(12,45,94,0.3)", border: "1px solid rgba(24,95,165,0.2)", color: "white" }}
            onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(24,95,165,0.2)"}
          />
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          {filtered.map((tool, i) => (
            <div key={tool.id} className="tool-card rounded-[28px] p-7 cursor-pointer"
              style={{
                animation: `fadeUp 0.4s ${0.1 + i * 0.06}s ease both`,
                background: "rgba(12,45,94,0.2)",
                border: `1px solid ${tool.border}`,
                boxShadow: `0 0 40px ${tool.glow}`,
              }}
              onClick={() => router.push(tool.path)}>

              {/* Icon + Tag */}
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `${tool.glow}`, border: `1px solid ${tool.border}`, color: tool.accent }}>
                  {tool.icon}
                </div>
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                  style={{ background: `${tool.glow}`, border: `1px solid ${tool.border}`, color: tool.accent }}>
                  {tool.tag}
                </span>
              </div>

              <h2 className="text-lg font-black mb-2">{tool.title}</h2>
              <p className="text-white/40 text-sm leading-relaxed mb-6">{tool.desc}</p>

              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: `${tool.accent}22`, border: `1px solid ${tool.border}`, color: tool.accent }}
                onClick={e => { e.stopPropagation(); router.push(tool.path); }}>
                {tool.btn} <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Bottom row: Recent Activity + Stats */}
        <div className="grid grid-cols-2 gap-6" style={{ animation: "fadeUp 0.4s 0.3s ease both" }}>

          {/* Recent Activity */}
          <div className="rounded-[28px] p-7" style={{ background: "rgba(12,45,94,0.2)", border: "1px solid rgba(24,95,165,0.15)" }}>
            <div className="flex items-center gap-2 mb-5">
              <Clock size={14} className="text-white/30" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Recent Activity</span>
            </div>
            {activity.length === 0 ? (
              <div className="text-center py-6 text-white/20">
                <p className="text-sm font-mono">No activity yet</p>
                <p className="text-xs mt-1">Use a tool to see your history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2"
                    style={{ borderBottom: i < activity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.color || "#185FA5", animation: "pulseDot 2s infinite" }} />
                      <span className="text-sm font-semibold text-white/70">{a.tool}</span>
                      {a.topic && <span className="text-xs text-white/30 font-mono">— {a.topic}</span>}
                    </div>
                    <span className="text-[10px] font-mono text-white/20">{a.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="rounded-[28px] p-7" style={{ background: "rgba(12,45,94,0.2)", border: "1px solid rgba(201,168,76,0.15)" }}>
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={14} style={{ color: "#C9A84C" }} />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "#C9A84C" }}>Toolkit Stats</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Chats", val: activity.filter(a => a.tool === "AI Assistant").length, color: "#185FA5" },
                { label: "Notes", val: activity.filter(a => a.tool === "Notes Generator").length, color: "#C9A84C" },
                { label: "Quizzes", val: activity.filter(a => a.tool === "Quiz Generator").length, color: "#10B981" },
              ].map(s => (
                <div key={s.label} className="text-center py-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-mono text-white/20 mt-4 text-center">Activity logged automatically as you use each tool</p>
          </div>
        </div>

      </main>
    </div>
  );
}