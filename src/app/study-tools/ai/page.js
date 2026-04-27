"use client";
import React, { useState, useEffect, useRef } from "react";
import { Send, Plus, ArrowLeft, Sparkles, Loader, MessageSquare, Trash2 } from "lucide-react";
import Sidebar from "@/components/shared/sidebar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { generatePlan } from "@/lib/gemini";
import { saveAIChat, getAIChats } from "@/lib/services/toolsService";

const SUGGESTIONS = [
  "Explain Big O notation with examples",
  "Summarize the French Revolution in 5 points",
  "How does TCP/IP work?",
  "Give me a study plan for Data Structures",
  "What is the difference between RAM and ROM?",
];

export default function AIAssistantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid;

  const [input, setInput] = useState("");
  const [chats, setChats] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history from Firestore
  useEffect(() => {
    if (!uid) return;
    getAIChats(uid).then(history => {
      setChats(history.map(h => ({ q: h.question, a: h.answer })));
      setLoaded(true);
    });
  }, [uid]);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chats, thinking]);

  // AFTER — replace the handleSend function
  const handleSend = async (overrideInput) => {
    const question = (overrideInput || input).trim();
    if (!question || thinking) return;

    setInput("");
    setChats(prev => [...prev, { q: question, a: null }]);
    setThinking(true);

    try {
      // Build conversation history for context
      const messages = [
        ...chats.filter(c => c.a).flatMap(c => ([
          { role: "user", text: c.q },
          { role: "model", text: c.a },
        ])),
        { role: "user", text: question },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const data = await res.json();
      const answer = data.reply || "I encountered an error. Please try again.";

      setChats(prev => {
        const updated = [...prev];
        updated[updated.length - 1].a = answer;
        return updated;
      });

      if (uid) await saveAIChat(uid, question, answer);
    } catch {
      setChats(prev => {
        const updated = [...prev];
        updated[updated.length - 1].a = "I encountered an error. Please try again.";
        return updated;
      });
    }

    setThinking(false);
    inputRef.current?.focus();
  };

  const handleClear = () => setChats([]);

  return (
    <div className="flex min-h-screen bg-[#0A1628] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes spin { to{transform:rotate(360deg)} }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(24,95,165,0.3); border-radius: 2px; }
                .msg-in { animation: fadeUp 0.3s ease both; }
            `}</style>

      <Sidebar activePage="tools" />

      <main className="flex-1 ml-64 flex flex-col h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ background: "rgba(10,22,40,0.9)", borderBottom: "1px solid rgba(24,95,165,0.15)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/study-tools")}
              className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-sm font-mono">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #185FA5, #0C2D5E)", border: "1px solid rgba(24,95,165,0.4)" }}>
                <Sparkles size={13} />
              </div>
              <div>
                <h1 className="text-sm font-black">AI Assistant</h1>
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Gemini Powered</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {chats.length > 0 && (
              <button onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono text-white/30 hover:text-white transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                <Trash2 size={12} /> Clear
              </button>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "pulseDot 2s infinite" }} />
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
        </header>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Empty state */}
            {chats.length === 0 && !thinking && (
              <div className="text-center pt-16 pb-8" style={{ animation: "fadeUp 0.4s ease both" }}>
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: "linear-gradient(135deg, #185FA5, #0C2D5E)", border: "1px solid rgba(24,95,165,0.4)", boxShadow: "0 0 40px rgba(24,95,165,0.2)" }}>
                  <Sparkles size={26} />
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2">How can I help you?</h2>
                <p className="text-white/30 text-sm mb-8">Ask me anything — concepts, problems, study plans, explanations.</p>

                {/* Suggestions */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)}
                      className="px-4 py-2 rounded-2xl text-xs font-mono text-white/50 hover:text-white transition-all"
                      style={{ background: "rgba(12,45,94,0.3)", border: "1px solid rgba(24,95,165,0.2)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {chats.map((chat, i) => (
              <div key={i} className="msg-in space-y-4">
                {/* User question */}
                <div className="flex justify-end">
                  <div className="max-w-[75%] px-5 py-3 rounded-3xl rounded-tr-lg"
                    style={{ background: "rgba(24,95,165,0.2)", border: "1px solid rgba(24,95,165,0.3)" }}>
                    <p className="text-sm font-semibold">{chat.q}</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #185FA5, #0C2D5E)" }}>
                        <Sparkles size={10} />
                      </div>
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Astra</span>
                    </div>
                    <div className="px-5 py-4 rounded-3xl rounded-tl-lg"
                      style={{ background: "rgba(12,45,94,0.25)", border: "1px solid rgba(24,95,165,0.15)" }}>
                      {chat.a ? (
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{chat.a}</p>
                      ) : (
                        <div className="flex items-center gap-2 py-1">
                          <Loader size={13} className="text-white/40" style={{ animation: "spin 1s linear infinite" }} />
                          <span className="text-xs font-mono text-white/30">Thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking indicator if no placeholder yet */}
            {thinking && chats[chats.length - 1]?.a !== null && (
              <div className="flex justify-start msg-in">
                <div className="px-5 py-3 rounded-3xl rounded-tl-lg"
                  style={{ background: "rgba(12,45,94,0.25)", border: "1px solid rgba(24,95,165,0.15)" }}>
                  <div className="flex items-center gap-2">
                    <Loader size={13} className="text-white/40" style={{ animation: "spin 1s linear infinite" }} />
                    <span className="text-xs font-mono text-white/30">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 px-8 py-5" style={{ borderTop: "1px solid rgba(24,95,165,0.1)", background: "rgba(10,22,40,0.8)" }}>
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="w-full px-5 py-3.5 rounded-2xl text-sm outline-none resize-none transition-all placeholder:text-white/20 font-mono"
                style={{ background: "rgba(12,45,94,0.3)", border: "1px solid rgba(24,95,165,0.25)", color: "white", lineHeight: "1.5", maxHeight: 120 }}
                onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(24,95,165,0.25)"}
              />
            </div>
            <button onClick={() => handleSend()} disabled={!input.trim() || thinking}
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: input.trim() && !thinking ? "#185FA5" : "rgba(24,95,165,0.15)",
                border: `1px solid ${input.trim() && !thinking ? "#185FA5" : "rgba(24,95,165,0.2)"}`,
                color: input.trim() && !thinking ? "white" : "rgba(255,255,255,0.2)",
              }}>
              {thinking ? <Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-center text-[9px] font-mono text-white/15 mt-2">Powered by Gemini · Responses are AI-generated guidance only</p>
        </div>
      </main>
    </div>
  );
}