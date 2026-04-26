"use client";
import React, { useState, useEffect } from "react";
import { ArrowLeft, Zap, Trophy, RotateCcw, Clock, Target, Check, X, Loader, ChevronRight } from "lucide-react";
import Sidebar from "@/components/shared/sidebar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { saveQuizResult, getQuizResults } from "@/lib/services/toolsService";

// ── QUIZ SETUP PAGE ───────────────────────────────────────────────────────────
function QuizSetup({ onStart }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const DIFFICULTIES = [
    { key: "Easy", color: "#10B981", glow: "rgba(16,185,129,0.15)" },
    { key: "Medium", color: "#C9A84C", glow: "rgba(201,168,76,0.15)" },
    { key: "Hard", color: "#EF4444", glow: "rgba(239,68,68,0.15)" },
  ];

  const QUICK_TOPICS = ["DBMS", "OS", "DSA", "Java", "React", "Physics", "Math", "Chemistry"];
  const COUNTS = [5, 10, 15];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty, questions: count }),
      });
      const data = await res.json();
      if (data.success && data.quiz?.length) {
        onStart(data.quiz, topic, difficulty);
      } else {
        setError("Failed to generate quiz. Try a different topic.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#0A1628] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin { to{transform:rotate(360deg)} }
                @keyframes pulseDot { 0%,100%{transform:scale(1)} 50%{transform:scale(0.7)} }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 2px; }
            `}</style>

      <Sidebar activePage="tools" />

      <main className="flex-1 ml-64 p-10 overflow-y-auto">

        {/* Header */}
        <div className="mb-8" style={{ animation: "fadeUp 0.4s ease both" }}>
          <button onClick={() => router.push("/study-tools")}
            className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-sm font-mono mb-5">
            <ArrowLeft size={15} /> Back to Tools
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Zap size={17} color="#10B981" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Quiz Generator</h1>
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Interactive AI Quizzes</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">

          {/* Left - Setup */}
          <div className="col-span-2 space-y-5" style={{ animation: "fadeUp 0.4s 0.05s ease both" }}>

            <div className="rounded-[24px] p-7" style={{ background: "rgba(12,45,94,0.2)", border: "1px solid rgba(16,185,129,0.15)" }}>

              {/* Topic */}
              <div className="mb-5">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 block mb-2">Topic</label>
                <input value={topic} onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleGenerate()}
                  placeholder="e.g. Binary Trees, Thermodynamics, React Hooks..."
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all placeholder:text-white/15 font-mono"
                  style={{ background: "rgba(10,22,40,0.6)", border: "1px solid rgba(24,95,165,0.2)", color: "white" }}
                  onFocus={e => e.target.style.borderColor = "rgba(16,185,129,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(24,95,165,0.2)"}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {QUICK_TOPICS.map(t => (
                    <button key={t} onClick={() => setTopic(t)}
                      className="px-3 py-1 rounded-xl text-[11px] font-mono transition-all"
                      style={{ background: topic === t ? "rgba(16,185,129,0.15)" : "rgba(12,45,94,0.3)", border: `1px solid ${topic === t ? "rgba(16,185,129,0.4)" : "rgba(24,95,165,0.2)"}`, color: topic === t ? "#10B981" : "rgba(255,255,255,0.35)" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="mb-5">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 block mb-3">Difficulty</label>
                <div className="flex gap-3">
                  {DIFFICULTIES.map(d => (
                    <button key={d.key} onClick={() => setDifficulty(d.key)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: difficulty === d.key ? d.glow : "rgba(255,255,255,0.03)",
                        border: `1px solid ${difficulty === d.key ? d.color : "rgba(255,255,255,0.08)"}`,
                        color: difficulty === d.key ? d.color : "rgba(255,255,255,0.3)",
                      }}>
                      {d.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question count */}
              <div className="mb-6">
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 block mb-3">Number of Questions</label>
                <div className="flex gap-3">
                  {COUNTS.map(n => (
                    <button key={n} onClick={() => setCount(n)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: count === n ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${count === n ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)"}`,
                        color: count === n ? "#10B981" : "rgba(255,255,255,0.3)",
                      }}>
                      {n} Qs
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-400 font-mono mb-3">{error}</p>}

              <button onClick={handleGenerate} disabled={!topic.trim() || loading}
                className="w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: topic.trim() && !loading ? "linear-gradient(135deg, #10B981, #059669)" : "rgba(255,255,255,0.05)",
                  color: topic.trim() && !loading ? "white" : "rgba(255,255,255,0.2)",
                  cursor: topic.trim() && !loading ? "pointer" : "not-allowed",
                  boxShadow: topic.trim() && !loading ? "0 4px 20px rgba(16,185,129,0.25)" : "none",
                }}>
                {loading
                  ? <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating Quiz...</>
                  : <><Zap size={14} fill="currentColor" /> Generate Quiz</>
                }
              </button>
            </div>

            {/* Tip */}
            <div className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: "rgba(12,45,94,0.15)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
                <Target size={14} color="#C9A84C" />
              </div>
              <div>
                <p className="text-xs font-bold text-white/60">Pro Tip</p>
                <p className="text-xs text-white/30 font-mono mt-0.5">Mix topics for better retention — e.g. "DBMS and Normalization together". Hard mode gives more XP and tests edge cases.</p>
              </div>
            </div>
          </div>

          {/* Right - Stats */}
          <div className="space-y-5" style={{ animation: "fadeUp 0.4s 0.1s ease both" }}>
            <QuizStats />
          </div>
        </div>
      </main>
    </div>
  );
}

// ── QUIZ STATS SIDEBAR ────────────────────────────────────────────────────────
function QuizStats() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    getQuizResults(user.uid).then(setResults);
  }, [user]);

  const avg = results.length
    ? Math.round(results.reduce((s, r) => s + r.percent, 0) / results.length)
    : 0;

  return (
    <>
      <div className="rounded-[24px] p-6" style={{ background: "rgba(12,45,94,0.2)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={14} color="#C9A84C" />
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Your Stats</p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40 font-mono">Quizzes Taken</span>
            <span className="text-sm font-black" style={{ color: "#10B981" }}>{results.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40 font-mono">Avg Score</span>
            <span className="text-sm font-black" style={{ color: "#C9A84C" }}>{avg}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${avg}%`, background: "linear-gradient(90deg, #10B981, #059669)" }} />
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="rounded-[24px] p-5" style={{ background: "rgba(12,45,94,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-3">Recent</p>
          <div className="space-y-2.5">
            {results.slice(0, 4).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5"
                style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div>
                  <p className="text-xs font-semibold text-white/70 truncate max-w-[120px]">{r.topic}</p>
                  <p className="text-[9px] font-mono text-white/25">{r.difficulty}</p>
                </div>
                <span className="text-xs font-black"
                  style={{ color: r.percent >= 70 ? "#10B981" : r.percent >= 50 ? "#C9A84C" : "#EF4444" }}>
                  {r.score}/{r.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── QUIZ PLAY ─────────────────────────────────────────────────────────────────
function QuizPlay({ quiz, topic, difficulty, onFinish, onExit }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [time, setTime] = useState(30);
  const [finished, setFinished] = useState(false);

  const LETTERS = ["A", "B", "C", "D"];

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => {
      setTime(prev => {
        if (prev <= 1) { handleNext(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [current, finished]);

  const handleAnswer = (opt) => {
    if (showResult) return;
    setSelected(opt);
    setShowResult(true);
    setAnswers(prev => ({ ...prev, [current]: opt }));
    setTimeout(handleNext, 900);
  };

  const handleNext = () => {
    setSelected(null);
    setShowResult(false);
    setTime(30);
    if (current + 1 < quiz.length) setCurrent(prev => prev + 1);
    else setFinished(true);
  };

  const getScore = () => quiz.filter((q, i) => answers[i] === q.answer).length;

  const q = quiz[current];
  const timePct = (time / 30) * 100;
  const score = getScore();

  // ── RESULTS ──
  if (finished) {
    const pct = Math.round((score / quiz.length) * 100);
    const color = pct >= 70 ? "#10B981" : pct >= 50 ? "#C9A84C" : "#EF4444";

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ animation: "fadeUp 0.4s ease both" }}>
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
              <Trophy size={34} color={color} />
            </div>
            <h2 className="text-3xl font-black mb-2">Quiz Complete!</h2>
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="text-4xl font-black" style={{ color }}>{score}/{quiz.length}</span>
              <span className="text-xl text-white/40">·</span>
              <span className="text-2xl font-black" style={{ color }}>{pct}%</span>
            </div>
            <p className="text-white/40 text-sm font-mono">{topic} · {difficulty}</p>
          </div>

          {/* Answer review */}
          <div className="rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-5 py-3 flex items-center gap-3" style={{ background: "rgba(12,45,94,0.3)" }}>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Answer Review</span>
            </div>
            {quiz.map((item, i) => {
              const correct = answers[i] === item.answer;
              return (
                <div key={i} className="px-5 py-3 flex items-start gap-4"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: correct ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: correct ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }}>
                    {correct ? <Check size={12} color="#10B981" /> : <X size={12} color="#EF4444" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 mb-1">{item.question}</p>
                    {!correct && <p className="text-[10px] font-mono" style={{ color: "#10B981" }}>✓ {item.answer}</p>}
                    {!correct && answers[i] && <p className="text-[10px] font-mono" style={{ color: "#EF4444" }}>✗ {answers[i]}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={onExit}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
              Exit
            </button>
            <button onClick={() => onFinish(score, quiz.length)}
              className="flex-[2] py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "white", boxShadow: "0 4px 20px rgba(16,185,129,0.25)" }}>
              <RotateCcw size={14} /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUESTION ──
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left stats */}
      <div className="w-56 flex-shrink-0 p-6 flex flex-col gap-5"
        style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20 mb-1">Question</p>
          <p className="text-2xl font-black">{current + 1}<span className="text-white/30 text-base">/{quiz.length}</span></p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20 mb-1">Score</p>
          <p className="text-2xl font-black" style={{ color: "#10B981" }}>{score}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20 mb-1">Accuracy</p>
          <p className="text-2xl font-black" style={{ color: "#C9A84C" }}>
            {current > 0 ? Math.round((score / current) * 100) : 100}%
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20 mb-2">Difficulty</p>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: difficulty === "Hard" ? "rgba(239,68,68,0.12)" : difficulty === "Easy" ? "rgba(16,185,129,0.12)" : "rgba(201,168,76,0.12)",
              color: difficulty === "Hard" ? "#EF4444" : difficulty === "Easy" ? "#10B981" : "#C9A84C",
            }}>
            {difficulty}
          </span>
        </div>
      </div>

      {/* Main question */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Progress + timer */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${((current) / quiz.length) * 100}%`, background: "linear-gradient(90deg, #10B981, #059669)" }} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl flex-shrink-0"
              style={{ background: time <= 10 ? "rgba(239,68,68,0.12)" : "rgba(12,45,94,0.4)", border: `1px solid ${time <= 10 ? "rgba(239,68,68,0.3)" : "rgba(24,95,165,0.2)"}` }}>
              <Clock size={11} color={time <= 10 ? "#EF4444" : "#C9A84C"} />
              <span className="text-[11px] font-mono font-bold" style={{ color: time <= 10 ? "#EF4444" : "#C9A84C" }}>{time}s</span>
            </div>
            <button onClick={onExit} className="text-white/20 hover:text-white/50 transition-colors text-xs font-mono">Exit</button>
          </div>

          {/* Question */}
          <div className="rounded-2xl p-7 mb-5" style={{ background: "rgba(12,45,94,0.25)", border: "1px solid rgba(24,95,165,0.15)" }}>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/25 mb-3">Question {current + 1}</p>
            <h3 className="text-lg font-bold leading-relaxed">{q.question}</h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let bg = "rgba(12,45,94,0.2)";
              let border = "rgba(24,95,165,0.15)";
              let color = "white";

              if (showResult) {
                if (opt === q.answer) { bg = "rgba(16,185,129,0.12)"; border = "rgba(16,185,129,0.4)"; color = "#10B981"; }
                else if (opt === selected) { bg = "rgba(239,68,68,0.12)"; border = "rgba(239,68,68,0.4)"; color = "#EF4444"; }
              }

              return (
                <div key={i} onClick={() => handleAnswer(opt)}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200"
                  style={{ background: bg, border: `1px solid ${border}`, color }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "inherit" }}>
                    {LETTERS[i]}
                  </div>
                  <span className="text-sm font-semibold">{opt}</span>
                  {showResult && opt === q.answer && <Check size={16} className="ml-auto flex-shrink-0" />}
                  {showResult && opt === selected && opt !== q.answer && <X size={16} className="ml-auto flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROOT COMPONENT ────────────────────────────────────────────────────────────
export default function QuizPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [quiz, setQuiz] = useState(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");

  const handleStart = (q, t, d) => { setQuiz(q); setTopic(t); setDifficulty(d); };

  const handleFinish = async (score, total) => {
    if (uid) await saveQuizResult(uid, topic, difficulty, score, total);
    setQuiz(null);
  };

  const handleExit = () => setQuiz(null);

  return (
    <div className="flex min-h-screen bg-[#0A1628] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin { to{transform:rotate(360deg)} }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 2px; }
            `}</style>

      {!quiz ? (
        <QuizSetup onStart={handleStart} />
      ) : (
        <>
          <Sidebar activePage="tools" />
          <div className="flex-1 ml-64 flex flex-col h-screen">
            <header className="flex items-center justify-between px-8 py-4 flex-shrink-0"
              style={{ background: "rgba(10,22,40,0.9)", borderBottom: "1px solid rgba(16,185,129,0.12)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <Zap size={13} color="#10B981" />
                </div>
                <div>
                  <p className="text-sm font-black">{topic}</p>
                  <p className="text-[9px] font-mono text-white/30">{quiz.length} questions · {difficulty}</p>
                </div>
              </div>
            </header>
            <QuizPlay quiz={quiz} topic={topic} difficulty={difficulty} onFinish={handleFinish} onExit={handleExit} />
          </div>
        </>
      )}
    </div>
  );
}