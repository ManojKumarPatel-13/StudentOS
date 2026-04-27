"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, FileText, ImageIcon, FileDown, Copy, RefreshCw, Save, Check, Loader, BookOpen, Clock } from "lucide-react";
import Sidebar from "@/components/shared/sidebar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { saveNote, getSavedNotes, findAndSaveRelatedNotes } from "@/lib/services/toolsService";

export default function NotesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid;

  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("text");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedNotes, setSavedNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [flashMode, setFlashMode] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState([]);

  // Button states
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getSavedNotes(uid).then(setSavedNotes);
  }, [uid]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setNotes("");
    setSelectedNote(null);

    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes);
      } else {
        setNotes("Failed to generate notes. Please try again.");
      }
    } catch {
      setNotes("Network error. Please check your connection.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    if (!notes || !uid) return;
    const noteId = await saveNote(uid, topic, notes, mode);
    setSaved(true);
    getSavedNotes(uid).then(setSavedNotes);
    setTimeout(() => setSaved(false), 1500);
    setTimeout(() => loadFlashcards(noteId), 3000);
    const allNotes = await getSavedNotes(uid);
    findAndSaveRelatedNotes(uid, noteId, topic, allNotes)
      .then(related => { if (related?.length) setRelatedNotes(related); });
  };

  const handleDownload = () => {
    const blob = new Blob([notes], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic || "notes"}.txt`;
    a.click();
  };

  const handleSummary = async () => {
    if (!topic.trim()) return;
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, mode: "summary" }),
      });
      const data = await res.json();
      if (data.success) setNotes(data.notes);
    } catch (e) { console.error(e); }
    setSummaryLoading(false);
  };

  const MODES = [
    { key: "text", label: "Text", icon: FileText },
    { key: "image", label: "Image", icon: ImageIcon },
    { key: "pdf", label: "PDF", icon: FileDown },
  ];

  const loadFlashcards = async (noteId) => {
    if (!uid || !noteId) return;
    try {
      const snap = await getDoc(doc(db, "users", uid, "flashcards", noteId));
      if (snap.exists()) setFlashcards(snap.data().cards || []);
      else setFlashcards([]);
    } catch (e) { setFlashcards([]); }
  };

  return (
    <div className="flex min-h-screen bg-[#0A1628] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin { to{transform:rotate(360deg)} }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
            `}</style>

      <Sidebar activePage="tools" />

      <main className="flex-1 ml-64 flex flex-col h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ background: "rgba(10,22,40,0.9)", borderBottom: "1px solid rgba(201,168,76,0.12)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/study-tools")}
              className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-sm font-mono">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)" }}>
                <FileText size={13} color="#C9A84C" />
              </div>
              <div>
                <h1 className="text-sm font-black">Notes Generator</h1>
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">AI Structured Notes</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {notes && (
            <div className="flex items-center gap-2">
              {[
                { label: copied ? "Copied!" : "Copy", icon: copied ? Check : Copy, action: handleCopy, active: copied },
                { label: "Download", icon: FileDown, action: handleDownload, active: false },
                { label: saved ? "Saved!" : "Save", icon: saved ? Check : Save, action: handleSave, active: saved },
                { label: summaryLoading ? "Loading..." : "5-min Read", icon: Clock, action: handleSummary, active: false },
                { label: "Flashcards", icon: BookOpen, action: () => { setFlashMode(f => !f); setCardIndex(0); setFlipped(false); }, active: flashMode },
              ].map(b => (
                <button key={b.label} onClick={b.action}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: b.active ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${b.active ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.08)"}`,
                    color: b.active ? "#C9A84C" : "rgba(255,255,255,0.5)",
                  }}>
                  <b.icon size={12} /> {b.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">

          {/* Left panel - input */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-4 p-6 overflow-y-auto"
            style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>

            {/* Topic input */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(12,45,94,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 block mb-2">Topic</label>
              <input value={topic} onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
                placeholder="e.g. DBMS Normalization, Newton's Laws..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all placeholder:text-white/15 font-mono"
                style={{ background: "rgba(10,22,40,0.6)", border: "1px solid rgba(24,95,165,0.2)", color: "white" }}
                onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(24,95,165,0.2)"}
              />

              {/* Mode selector */}
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mt-4 mb-2">Input Mode</p>
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {MODES.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setMode(key)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all"
                    style={{
                      background: mode === key ? "rgba(201,168,76,0.15)" : "transparent",
                      color: mode === key ? "#C9A84C" : "rgba(255,255,255,0.3)",
                      borderRight: key !== "pdf" ? "1px solid rgba(255,255,255,0.06)" : "none",
                    }}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>

              {/* Upload area */}
              {mode !== "text" && (
                <div className="mt-4 rounded-xl p-5 text-center cursor-pointer transition-all"
                  style={{ border: "1px dashed rgba(201,168,76,0.25)", background: "rgba(201,168,76,0.04)" }}>
                  <p className="text-xs font-bold" style={{ color: "#C9A84C" }}>
                    {mode === "image" ? "Upload Images" : "Upload PDF"}
                  </p>
                  <p className="text-[10px] text-white/25 mt-1 font-mono">Drag & drop or click</p>
                </div>
              )}

              <button onClick={handleGenerate} disabled={!topic.trim() || loading}
                className="mt-5 w-full py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2"
                style={{
                  background: topic.trim() && !loading ? "linear-gradient(135deg, #C9A84C, #A07830)" : "rgba(255,255,255,0.05)",
                  color: topic.trim() && !loading ? "#0A1628" : "rgba(255,255,255,0.2)",
                  cursor: topic.trim() && !loading ? "pointer" : "not-allowed",
                }}>
                {loading
                  ? <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
                  : <><FileText size={14} /> Generate Notes</>
                }
              </button>
            </div>

            {/* Quick topics */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20 mb-2 px-1">Quick Topics</p>
              <div className="flex flex-wrap gap-2">
                {["DBMS", "OS", "Algorithms", "React", "Physics", "Calculus"].map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-mono transition-all"
                    style={{ background: "rgba(12,45,94,0.3)", border: "1px solid rgba(24,95,165,0.2)", color: "rgba(255,255,255,0.4)" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved notes */}
            {savedNotes.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: "rgba(12,45,94,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={11} className="text-white/30" />
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Saved Notes</p>
                </div>
                <div className="space-y-2">
                  {savedNotes.slice(0, 5).map((n, i) => (
                    <button key={i} onClick={() => {
                      setSelectedNote(n);
                      setNotes(n.content);
                      setTopic(n.topic);
                      setFlashMode(false);
                      loadFlashcards(n.id);
                      setRelatedNotes(n.relatedNotes || []);
                    }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs transition-all"
                      style={{
                        background: selectedNote?.id === n.id ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selectedNote?.id === n.id ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.06)"}`,
                        color: "rgba(255,255,255,0.6)",
                      }}>
                      <BookOpen size={10} className="inline mr-1.5 opacity-50" />
                      {n.topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel - output */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!notes && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center"
                style={{ animation: "fadeUp 0.4s ease both" }}>
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <FileText size={26} color="#C9A84C" />
                </div>
                <h3 className="text-lg font-black mb-2">Notes will appear here</h3>
                <p className="text-white/30 text-sm">Enter a topic and click Generate Notes</p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center">
                <Loader size={28} color="#C9A84C" style={{ animation: "spin 1s linear infinite", marginBottom: 16 }} />
                <p className="text-white/40 text-sm font-mono">Generating structured notes...</p>
              </div>
            )}

            {notes && !loading && (
              <div className="rounded-2xl p-7 h-full" style={{ background: "rgba(12,45,94,0.15)", border: "1px solid rgba(201,168,76,0.12)" }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Generated Notes</p>
                    <h3 className="text-base font-black mt-0.5" style={{ color: "#C9A84C" }}>{topic}</h3>
                  </div>
                  <button onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                    style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", color: "#C9A84C" }}>
                    <RefreshCw size={11} /> Regenerate
                  </button>
                </div>
                <div className="h-px mb-5" style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)" }} />
                <pre className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap font-mono"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {notes}
                </pre>
                {/* Related Notes */}
                {relatedNotes.length > 0 && (
                  <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(24,95,165,0.15)" }}>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-3">
                      🔗 Knowledge Web — Related Notes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {relatedNotes.map((n, i) => (
                        <button key={i}
                          onClick={() => {
                            const found = savedNotes.find(s => s.id === n.id);
                            if (found) {
                              setSelectedNote(found);
                              setNotes(found.content);
                              setTopic(found.topic);
                              setFlashMode(false);
                              loadFlashcards(found.id);
                              setRelatedNotes(found.relatedNotes || []);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all"
                          style={{
                            background: "rgba(24,95,165,0.1)",
                            border: "1px solid rgba(24,95,165,0.25)",
                            color: "rgba(255,255,255,0.6)",
                          }}>
                          <BookOpen size={11} className="opacity-50" />
                          {n.topic}
                          <span className="text-white/20">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Flashcard overlay */}
        {flashMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(10,22,40,0.95)", backdropFilter: "blur(20px)" }}>

            <button onClick={() => setFlashMode(false)}
              className="absolute top-6 right-6 text-white/30 hover:text-white text-2xl transition-colors">
              ×
            </button>

            <div className="text-center w-full max-w-lg px-6">
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-6">
                {topic} · Card {cardIndex + 1} of {flashcards.length}
              </p>

              {flashcards.length === 0 ? (
                <div className="rounded-3xl p-10" style={{ background: "rgba(12,45,94,0.4)", border: "1px solid rgba(24,95,165,0.2)" }}>
                  <p className="text-white/40 text-sm">Flashcards are being generated... Save the note first, then wait ~5 seconds.</p>
                </div>
              ) : (
                <>
                  {/* Flip card */}
                  <div onClick={() => setFlipped(f => !f)} className="cursor-pointer"
                    style={{ perspective: "1000px" }}>
                    <div style={{
                      transition: "transform 0.5s",
                      transformStyle: "preserve-3d",
                      transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      position: "relative",
                      height: "220px",
                    }}>
                      {/* Front */}
                      <div style={{
                        backfaceVisibility: "hidden",
                        position: "absolute", inset: 0,
                        background: "rgba(12,45,94,0.4)",
                        border: "1px solid rgba(201,168,76,0.25)",
                        borderRadius: "24px",
                        display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
                      }}>
                        <p className="text-lg font-bold text-white text-center leading-relaxed">
                          {flashcards[cardIndex]?.front}
                        </p>
                      </div>
                      {/* Back */}
                      <div style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        position: "absolute", inset: 0,
                        background: "rgba(201,168,76,0.08)",
                        border: "1px solid rgba(201,168,76,0.4)",
                        borderRadius: "24px",
                        display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
                      }}>
                        <p className="text-base text-[#C9A84C] text-center leading-relaxed">
                          {flashcards[cardIndex]?.back}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-white/20 text-xs mt-4 mb-6">Click card to flip</p>

                  {/* Navigation */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => { setCardIndex(i => Math.max(0, i - 1)); setFlipped(false); }}
                      disabled={cardIndex === 0}
                      className="px-6 py-2.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-20"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                      ← Prev
                    </button>
                    <button
                      onClick={() => { setCardIndex(i => Math.min(flashcards.length - 1, i + 1)); setFlipped(false); }}
                      disabled={cardIndex === flashcards.length - 1}
                      className="px-6 py-2.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-20"
                      style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }}>
                      Next →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </main >
    </div >
  );
}