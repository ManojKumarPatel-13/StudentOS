"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, CheckCircle2, Play, Pause, Square, Sparkles } from "lucide-react";
import Sidebar from "@/components/shared/sidebar";
import { useAuth } from "@/context/authContext";
import {
    subscribeTodaysTasks,
    subscribeToSystemLogs,
    addTask,
    markTaskComplete,
    saveFocusSession,
    syncNeuralSnap,
    loadNeuralSnap,
    initializeUserAssets,
    getSubjectMastery,
    getKnowledgeGaps,
} from "@/lib/services/homeService";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split("T")[0];

function getDayProgress() {
    const now = new Date();
    const start = new Date(); start.setHours(6, 0, 0, 0);
    const end = new Date(); end.setHours(24, 0, 0, 0);
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

function getGreeting(name, taskPct, dayPct) {
    const h = new Date().getHours();
    const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const n = name?.split(" ")[0] || "Student";
    if (taskPct >= dayPct && taskPct > 0)
        return `${time}, ${n}. You're outpacing the day — keep this momentum.`;
    if (taskPct < dayPct && taskPct > 0)
        return `${time}, ${n}. The day is moving fast. Let's close the gap.`;
    return `${time}, ${n}. Astra is preparing your mission briefing.`;
}

function fmtTimer(s) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function getStatus(cp, dp) {
    if (cp >= 80) return { label: "Crushing It", color: "#10B981", glow: "rgba(16,185,129,0.2)" };
    if (cp >= dp) return { label: "On Track", color: "#185FA5", glow: "rgba(24,95,165,0.2)" };
    if (cp >= 20) return { label: "In Progress", color: "#C9A84C", glow: "rgba(201,168,76,0.2)" };
    return { label: "Falling Behind", color: "#EF4444", glow: "rgba(239,68,68,0.2)" };
}

const ENERGY_MAP = {
    High: { label: "⚡⚡⚡", color: "#F59E0B" },
    Medium: { label: "⚡⚡", color: "#185FA5" },
    Low: { label: "⚡", color: "#10B981" },
    high: { label: "⚡⚡⚡", color: "#F59E0B" },
    medium: { label: "⚡⚡", color: "#185FA5" },
    low: { label: "⚡", color: "#10B981" },
};

const FB_MASTERY = [
    { subject: "Mathematics", percent: 62, color: "#185FA5" },
    { subject: "Physics", percent: 85, color: "#C9A84C" },
    { subject: "Coding", percent: 94, color: "#10B981" },
    { subject: "Chemistry", percent: 40, color: "#8B5CF6" },
];

const FB_LOGS = [
    { id: "l1", type: "info", message: "Neural link stable. Astra online.", timestamp: { seconds: Date.now() / 1000 - 3600 } },
    { id: "l2", type: "info", message: "Focus session logged: Physics.", timestamp: { seconds: Date.now() / 1000 - 1800 } },
    { id: "l3", type: "alert", message: "Retention alert: Chemistry gap growing.", timestamp: { seconds: Date.now() / 1000 - 600 } },
];

// ── FOCUS VIAL ────────────────────────────────────────────────────────────────
function FocusVial({ tasks, uid }) {
    const [sel, setSel] = useState("");
    const [dur, setDur] = useState(25);
    const [secs, setSecs] = useState(25 * 60);
    const [running, setRunning] = useState(false);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef(null);

    const total = dur * 60;
    const fill = Math.round(((total - secs) / total) * 100);
    const task = tasks.find(t => t.id === sel);
    const energy = task?.energyLevel || task?.energyCost || "medium";
    const liquid = energy?.toLowerCase() === "high" ? "#F59E0B"
        : energy?.toLowerCase() === "low" ? "#10B981"
            : "#185FA5";

    const startTimer = () => {
        if (!sel) { alert("Please select a task before starting."); return; }
        setRunning(true); setPaused(false);
        timerRef.current = setInterval(() => {
            setSecs(s => {
                if (s <= 1) {
                    clearInterval(timerRef.current);
                    setRunning(false);
                    // Save to Firestore via service
                    if (uid) saveFocusSession(uid, {
                        subject: task?.subject || "General",
                        duration: dur,
                        focusScore: 85,
                        taskId: sel,
                    });
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    };

    const pause = () => { clearInterval(timerRef.current); setPaused(true); };
    const stop = () => {
        clearInterval(timerRef.current);
        // Save partial session if ran > 1 min
        const elapsed = total - secs;
        if (elapsed > 60 && uid) saveFocusSession(uid, {
            subject: task?.subject || "General",
            duration: Math.round(elapsed / 60),
            focusScore: 75,
            taskId: sel,
        });
        setRunning(false); setPaused(false); setSecs(dur * 60);
    };
    const toggle = () => { if (!running || paused) startTimer(); else pause(); };
    useEffect(() => () => clearInterval(timerRef.current), []);
    useEffect(() => { if (!running) setSecs(dur * 60); }, [dur]);

    return (
        <div className="flex flex-col items-center gap-4 h-full">
            <div>
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">Neural Focus</span>
                <h3 className="text-lg font-bold mt-0.5">Focus Session</h3>
            </div>

            {/* Vial */}
            <div className="relative w-32 h-56 rounded-full overflow-hidden flex flex-col justify-end"
                style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)" }}>
                <div className="w-full transition-all duration-1000 ease-linear relative"
                    style={{ height: `${Math.max(fill, 2)}%`, background: `linear-gradient(to top, ${liquid}cc, ${liquid}66)`, boxShadow: `0 0 30px ${liquid}55` }}>
                    {running && !paused && (
                        <div className="w-full h-3 animate-pulse" style={{ background: "rgba(255,255,255,0.15)" }} />
                    )}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black font-mono tracking-tighter">{fmtTimer(secs)}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                        {running && !paused ? "Deep Work" : paused ? "Paused" : "Ready"}
                    </span>
                </div>
                {running && !paused && (
                    <div className="absolute inset-0 rounded-full pointer-events-none"
                        style={{ boxShadow: `0 0 30px ${liquid}44`, animation: "vialGlow 2s ease-in-out infinite" }} />
                )}
            </div>

            {/* Task selector */}
            <select value={sel} onChange={e => setSel(e.target.value)} disabled={running && !paused}
                className="w-full text-xs font-mono rounded-2xl px-4 py-2.5 outline-none"
                style={{ background: "rgba(12,45,94,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: sel ? "white" : "rgba(255,255,255,0.3)" }}>
                <option value="">Select task to focus on...</option>
                {tasks.filter(t => !t.completed).map(t => (
                    <option key={t.id} value={t.id} style={{ background: "#0C2D5E" }}>{t.title}</option>
                ))}
            </select>

            {/* Duration pills */}
            {!running && (
                <div className="flex gap-2">
                    {[15, 25, 45, 60].map(m => (
                        <button key={m} onClick={() => setDur(m)}
                            className="px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all"
                            style={{
                                background: dur === m ? `${liquid}22` : "transparent",
                                border: `1px solid ${dur === m ? liquid : "rgba(255,255,255,0.1)"}`,
                                color: dur === m ? liquid : "rgba(255,255,255,0.3)",
                            }}>{m}m</button>
                    ))}
                </div>
            )}

            {/* Controls */}
            <div className="flex gap-2 w-full">
                <button onClick={toggle}
                    className="flex-1 py-3 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                    style={{
                        background: running && !paused ? "rgba(245,159,11,0.12)" : "#185FA5",
                        border: `1px solid ${running && !paused ? "#F59E0B" : "#185FA5"}`,
                        color: running && !paused ? "#F59E0B" : "white",
                        boxShadow: running && !paused ? "none" : "0 4px 20px rgba(24,95,165,0.3)",
                    }}>
                    {running && !paused ? <><Pause size={13} /> Pause</> : <><Play size={13} fill="currentColor" /> Initialize Focus</>}
                </button>
                {(running || paused) && (
                    <button onClick={stop} className="px-4 py-3 rounded-3xl transition-all"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
                        <Square size={13} fill="currentColor" />
                    </button>
                )}
            </div>

            <p className="text-center text-[10px] text-white/20 font-mono italic">
                {running ? `Astra monitoring — ${task?.subject}` : "Astra is standing by..."}
            </p>
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function HomePage() {
    const { user } = useAuth();
    const uid = user?.uid;

    // State
    const [tasks, setTasks] = useState([]);
    const [logs, setLogs] = useState(FB_LOGS);
    const [mastery, setMastery] = useState(FB_MASTERY);
    const [dayProgress, setDayProgress] = useState(getDayProgress());
    const [brainDump, setBrainDump] = useState("");
    const [snapSaved, setSnapSaved] = useState(true);
    const [taskInput, setTaskInput] = useState("");
    const [addModal, setAddModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: "", subject: "", scheduledAt: "09:00", energyLevel: "Medium" });
    const snapDebounce = useRef(null);
    const [taskFilter, setTaskFilter] = useState("all");

    // Derived
    const done = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const taskPct = total ? Math.round((done / total) * 100) : 0;
    const status = getStatus(taskPct, dayProgress);
    const greeting = getGreeting(user?.displayName, taskPct, dayProgress);

    const filteredTasks = tasks.filter(t => {
        const e = (t.energyLevel || t.energyCost || "").toLowerCase();
        if (taskFilter === "high") return e === "high";
        if (taskFilter === "medium") return e === "medium";
        if (taskFilter === "low") return e === "low";
        if (taskFilter === "done") return t.completed;
        if (taskFilter === "pending") return !t.completed;
        return true;
    });

    // ── Clock tick ──
    useEffect(() => {
        const t = setInterval(() => setDayProgress(getDayProgress()), 60000);
        return () => clearInterval(t);
    }, []);

    // ── Initialize user assets on first load ──
    useEffect(() => {
        if (!uid) return;
        initializeUserAssets(uid);
    }, [uid]);

    // ── Real-time task listener (onSnapshot) ──
    useEffect(() => {
        if (!uid) return;
        return subscribeTodaysTasks(uid, setTasks);
    }, [uid]);

    // ── Real-time Astra log listener ──
    useEffect(() => {
        if (!uid) return;
        return subscribeToSystemLogs(uid, setLogs);
    }, [uid]);

    // ── Load brain dump ──
    useEffect(() => {
        if (!uid) return;
        loadNeuralSnap(uid).then(content => setBrainDump(content));
    }, [uid]);

    // ── Load subject mastery ──
    useEffect(() => {
        if (!uid) return;
        getSubjectMastery(uid).then(m => { if (m.length) setMastery(m); });
    }, [uid]);

    // ── Brain dump auto-save (debounced 2s) ──
    useEffect(() => {
        if (!uid || brainDump === "") return;
        setSnapSaved(false);
        clearTimeout(snapDebounce.current);
        snapDebounce.current = setTimeout(() => {
            syncNeuralSnap(uid, brainDump).then(() => setSnapSaved(true));
        }, 2000);
        return () => clearTimeout(snapDebounce.current);
    }, [brainDump, uid]);

    // ── Handlers ──
    const handleAddTask = async () => {
        if (!taskInput.trim()) return;
        if (uid) {
            await addTask(uid, taskInput);
        } else {
            setTasks(p => [...p, { id: `l${Date.now()}`, title: taskInput, subject: "General", energyLevel: "Medium", scheduledAt: "09:00", completed: false, date: TODAY }]);
        }
        setTaskInput("");
    };

    const handleAddTaskModal = async () => {
        if (!newTask.title.trim()) return;
        if (uid) {
            await addTask(uid, newTask.title, newTask.subject || "General", {
                scheduledAt: newTask.scheduledAt,
                energyLevel: newTask.energyLevel,
                energyCost: newTask.energyLevel.toLowerCase(),
                date: TODAY,
            });
        }
        setAddModal(false);
        setNewTask({ title: "", subject: "", scheduledAt: "09:00", energyLevel: "Medium" });
    };

    const handleComplete = async (task) => {
        if (uid && !task.id.startsWith("l")) {
            await markTaskComplete(uid, task.id, task.title);
        } else {
            setTasks(p => p.map(t => t.id === task.id ? { ...t, completed: true } : t));
        }
    };

    const formatLogTime = (log) => {
        if (!log.timestamp?.seconds) return "--:--";
        const d = new Date(log.timestamp.seconds * 1000);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    return (
        <div className="flex min-h-screen bg-[#0A1628] text-white" style={{ fontFamily: "'Syne', sans-serif" }}>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
                @keyframes textShimmer {
                    0%   { background-position: 0% 50%; }
                    50%  { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes progressGlow {
                    0%,100% { box-shadow: 0 0 10px rgba(24,95,165,0.3); }
                    50%     { box-shadow: 0 0 25px rgba(201,168,76,0.5); }
                }
                @keyframes vialGlow {
                    0%,100% { opacity: 0.5; }
                    50%     { opacity: 1; }
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                @keyframes fadeUp {
                    from { opacity:0; transform:translateY(16px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes pulseDot {
                    0%,100% { transform:scale(1); }
                    50%     { transform:scale(0.7); }
                }
                .animate-shimmer-text {
                    background: linear-gradient(90deg, #FFFFFF, #185FA5, #C9A84C, #FFFFFF);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: textShimmer 5s linear infinite;
                }
                .progress-liquid {
                    background: linear-gradient(90deg, #185FA5, #C9A84C);
                    position: relative;
                    overflow: hidden;
                    animation: progressGlow 3s infinite;
                }
                .progress-liquid::after {
                    content: "";
                    position: absolute;
                    top:0; left:0; right:0; bottom:0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
                    transform: translateX(-100%);
                    animation: shimmer 2.5s infinite;
                }
                .task-card { transition: all 0.15s ease; }
                .task-card:hover { background: rgba(255,255,255,0.07) !important; transform: translateY(-1px); }
                .card-in { animation: fadeUp 0.5s cubic-bezier(.16,1,.3,1) both; }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(24,95,165,0.3); border-radius: 2px; }
                select option { background: #0C2D5E; }
                * { font-family: 'Syne', sans-serif; }
                .mono { font-family: 'JetBrains Mono', monospace !important; }
            `}</style>

            {/* Ambient glows */}
            <div className="fixed pointer-events-none z-0" style={{ top: -150, left: 280, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(24,95,165,0.07) 0%, transparent 65%)" }} />
            <div className="fixed pointer-events-none z-0" style={{ bottom: -150, right: 200, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 65%)" }} />

            {/* ── SIDEBAR ── */}
            <Sidebar activePage="home" />

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 ml-64 flex flex-col min-w-0 relative z-10">

                {/* ── HEADER ── */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 flex-shrink-0"
                    style={{ background: "rgba(10,22,40,0.9)", backdropFilter: "blur(20px)" }}>
                    <div className="mono text-[11px] text-white/30 tracking-[0.2em] uppercase">
                        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </div>
                    <div className="flex items-center gap-5">
                        {/* Quick add */}
                        <div className="flex gap-2">
                            <input value={taskInput} onChange={e => setTaskInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAddTask()}
                                placeholder="Quick add task... (Enter)"
                                className="mono w-72 bg-white/5 border border-white/10 rounded-full py-2 px-4 text-xs outline-none focus:border-[#C9A84C]/40 transition-all placeholder:text-white/20" />
                        </div>
                        <button onClick={() => setAddModal(true)}
                            className="flex items-center gap-2 bg-[#185FA5] hover:bg-blue-600 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
                            <Plus size={15} /> Add Task
                        </button>
                    </div>
                </header>

                <div className="p-10 space-y-8 overflow-y-auto flex-1">

                    {/* ── ASTRA GREETING ── */}
                    <section className="card-in rounded-[32px] p-8" style={{ animationDelay: "0.05s", background: "rgba(12,45,94,0.25)", border: "1px solid rgba(24,95,165,0.2)", backdropFilter: "blur(20px)" }}>
                        <div className="flex gap-4 items-start">
                            <div className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-base"
                                style={{ background: "linear-gradient(135deg, #185FA5, #0C2D5E)", border: "1px solid rgba(24,95,165,0.4)", boxShadow: "0 0 20px rgba(24,95,165,0.3)" }}>
                                <Sparkles size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <p className="mono text-[10px] uppercase tracking-[0.25em]" style={{ color: "#185FA5" }}>Astra Mentor · Neural OS</p>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "pulseDot 2s infinite" }} />
                                        <span className="mono text-[9px] text-emerald-400 uppercase tracking-widest">Live</span>
                                    </div>
                                </div>
                                <h1 className="text-3xl font-black tracking-tighter leading-tight animate-shimmer-text mb-3">
                                    {greeting}
                                </h1>
                                <div className="h-px w-full mb-3" style={{ background: "linear-gradient(90deg, rgba(24,95,165,0.3), transparent)" }} />
                                <p className="mono text-[11px] leading-relaxed" style={{ color: "rgba(245,240,232,0.45)" }}>
                                    {taskPct >= dayProgress
                                        ? `You are ahead of the day's curve. ${total - done} task${total - done !== 1 ? "s" : ""} remaining. Maintain this trajectory.`
                                        : `Day is ${dayProgress}% elapsed. Task completion at ${taskPct}%. Close the gap before energy drops.`}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ── OVERVIEW CARD ── */}
                    <section className="card-in rounded-[40px] p-8 backdrop-blur-3xl" style={{ animationDelay: "0.1s", background: "rgba(12,45,94,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="space-y-6">
                            {/* Task Completion */}
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <p className="mono text-[10px] text-white/30 uppercase tracking-[0.3em]">Neural Outlook</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <h3 className="text-lg font-bold">Task Completion</h3>
                                            <span className="mono text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: `${status.glow}`, border: `1px solid ${status.color}40`, color: status.color }}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-3xl font-black mono" style={{ color: "#C9A84C" }}>{taskPct}%</span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full progress-liquid rounded-full transition-all duration-1000" style={{ width: `${taskPct}%` }} />
                                </div>
                                <p className="mono text-[10px] text-white/20 mt-2">{done} of {total} tasks completed today</p>
                            </div>

                            {/* Day Progress */}
                            <div>
                                <div className="flex justify-between items-end text-white/30 mb-3">
                                    <p className="mono text-[10px] uppercase tracking-[0.3em]">Chronos Status</p>
                                    <span className="mono text-base font-bold tracking-tighter">{dayProgress}% day elapsed</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/20 rounded-full transition-all duration-1000" style={{ width: `${dayProgress}%` }} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── BENTO: Focus + Tasks ── */}
                    <div className="grid gap-8" style={{ gridTemplateColumns: "1.2fr 2fr" }}>

                        {/* Focus Vial Card */}
                        <section className="card-in rounded-[40px] p-8 backdrop-blur-3xl flex flex-col min-h-[480px]"
                            style={{ animationDelay: "0.15s", background: "rgba(12,45,94,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <FocusVial tasks={tasks} uid={uid} />
                        </section>

                        {/* ✅ Tasks Card — now properly wrapped */}
                        <section className="card-in rounded-[40px] p-8 backdrop-blur-3xl flex flex-col min-h-[480px]"
                            style={{ animationDelay: "0.2s", background: "rgba(12,45,94,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>

                            {/* Header */}
                            <div className="flex justify-between items-start mb-5 flex-shrink-0">
                                <div>
                                    <p className="mono text-[10px] text-white/30 uppercase tracking-[0.3em]">Archive Feed</p>
                                    <h3 className="text-lg font-bold mt-1">Today's Tasks</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black mono" style={{ color: "#C9A84C" }}>{String(done).padStart(2, "0")}</span>
                                    <p className="mono text-[10px] text-white/20 uppercase tracking-widest">Done</p>
                                </div>
                            </div>

                            {/* Classification tabs */}
                            <div className="flex gap-2 mb-5 flex-shrink-0 flex-wrap">
                                {[
                                    { key: "all", label: "All", count: tasks.length },
                                    { key: "high", label: "⚡⚡⚡", count: tasks.filter(t => (t.energyLevel || t.energyCost || "").toLowerCase() === "high").length },
                                    { key: "medium", label: "⚡⚡", count: tasks.filter(t => (t.energyLevel || t.energyCost || "").toLowerCase() === "medium").length },
                                    { key: "low", label: "⚡", count: tasks.filter(t => (t.energyLevel || t.energyCost || "").toLowerCase() === "low").length },
                                    { key: "done", label: "✓ Done", count: tasks.filter(t => t.completed).length },
                                    { key: "pending", label: "○ Pending", count: tasks.filter(t => !t.completed).length },
                                ].map(tab => (
                                    <button key={tab.key}
                                        onClick={() => setTaskFilter(tab.key)}
                                        className="mono px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5"
                                        style={{
                                            background: taskFilter === tab.key ? "rgba(24,95,165,0.25)" : "rgba(255,255,255,0.04)",
                                            border: `1px solid ${taskFilter === tab.key ? "rgba(24,95,165,0.5)" : "rgba(255,255,255,0.08)"}`,
                                            color: taskFilter === tab.key ? "white" : "rgba(255,255,255,0.35)",
                                        }}>
                                        {tab.label}
                                        <span className="px-1.5 py-0.5 rounded-full text-[8px]"
                                            style={{ background: taskFilter === tab.key ? "rgba(24,95,165,0.4)" : "rgba(255,255,255,0.08)", color: taskFilter === tab.key ? "white" : "rgba(255,255,255,0.3)" }}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Task list */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                {filteredTasks.length === 0 && (
                                    <div className="h-32 flex flex-col items-center justify-center opacity-20">
                                        <div className="w-10 h-10 border-2 border-dashed border-white rounded-full mb-3" />
                                        <p className="mono text-[10px] uppercase tracking-[0.3em]">No tasks in this category</p>
                                    </div>
                                )}
                                {filteredTasks.map(task => {
                                    const ec = ENERGY_MAP[task.energyLevel] || ENERGY_MAP[task.energyCost] || ENERGY_MAP.medium;
                                    return (
                                        <div key={task.id} onClick={() => handleComplete(task)}
                                            className="task-card flex items-center gap-4 p-4 rounded-3xl border border-white/5 cursor-pointer"
                                            style={{ background: task.completed ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.04)", opacity: task.completed ? 0.6 : 1 }}>
                                            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                                style={{ borderColor: task.completed ? "#10B981" : "rgba(255,255,255,0.15)", background: task.completed ? "rgba(16,185,129,0.15)" : "transparent" }}>
                                                {task.completed && <CheckCircle2 size={14} color="#10B981" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate"
                                                    style={{ textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "rgba(255,255,255,0.4)" : "white" }}>
                                                    {task.title}
                                                </p>
                                                <p className="mono text-[10px] text-white/20 uppercase tracking-widest mt-0.5">
                                                    {task.subject} · {task.scheduledAt}
                                                </p>
                                            </div>
                                            <span className="mono text-[11px] flex-shrink-0" style={{ color: ec.color }}>{ec.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                        </section>
                    </div>

                    {/* ── Mastery + Astra Log ── */}
                    <div className="grid gap-8" style={{ gridTemplateColumns: "1fr 380px" }}>

                        {/* Subject Mastery */}
                        <section className="card-in rounded-[40px] p-10 backdrop-blur-3xl"
                            style={{ animationDelay: "0.25s", background: "rgba(12,45,94,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <p className="mono text-[10px] text-white/30 uppercase tracking-[0.3em]">Neural Retention</p>
                            <h3 className="text-lg font-bold mt-1 mb-7">Subject Mastery</h3>
                            <div className="space-y-6">
                                {mastery.map((item, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-semibold text-white/70">{item.subject}</span>
                                            <span className="mono text-xs text-white/30">{item.percent}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.percent}%`, background: item.color, boxShadow: `0 0 12px ${item.color}44` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Astra Log */}
                        <section className="card-in rounded-[40px] p-8 flex flex-col"
                            style={{ animationDelay: "0.3s", background: "rgba(6,13,26,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <div className="flex items-center justify-between mb-7 flex-shrink-0">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: "#C9A84C" }}>Astra Log</h3>
                                    <p className="mono text-[9px] text-white/20 uppercase mt-1 tracking-widest">Active Neural Link</p>
                                </div>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 10px #C9A84C", animation: "pulseDot 2s infinite" }} />
                            </div>
                            <div className="flex-1 mono text-[11px] space-y-5 overflow-y-auto">
                                {logs.map((log, i) => (
                                    <div key={log.id || i} className="flex gap-4">
                                        <span className="flex-shrink-0 font-bold" style={{ color: log.type === "alert" ? "#C9A84C" : "rgba(24,95,165,0.7)" }}>{formatLogTime(log)}</span>
                                        <span className={log.type === "alert" ? "text-amber-300/80 font-bold" : "text-white/40 leading-relaxed"}>{log.message}</span>
                                    </div>
                                ))}
                                <div className="flex gap-4 animate-pulse">
                                    <span className="text-white/10 tracking-tighter">_ Listening...</span>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center mono text-[9px] text-white/20 uppercase tracking-[0.3em] flex-shrink-0">
                                <span>Astra v3.1</span>
                                <Sparkles size={12} className="opacity-20" />
                            </div>
                        </section>
                    </div>

                    {/* ── Neural Snap ── */}
                    <section className="card-in rounded-[40px] p-10 backdrop-blur-3xl flex flex-col min-h-[320px]"
                        style={{ animationDelay: "0.35s", background: "rgba(12,45,94,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="flex justify-between items-start mb-5 flex-shrink-0">
                            <div>
                                <p className="mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "#C9A84C" }}>Neural Interface</p>
                                <h3 className="text-xl font-bold mt-1">Neural Snap — Brain Dump</h3>
                                <p className="text-white/30 text-xs mt-1.5">Capture thoughts, lecture notes, or ideas without breaking flow.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Auto-save indicator */}
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-2xl border border-white/5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: snapSaved ? "#10B981" : "#C9A84C", animation: "pulseDot 2s infinite" }} />
                                    <span className="mono text-[10px] text-white/30 uppercase tracking-widest">{snapSaved ? "Auto-saved" : "Saving..."}</span>
                                </div>
                                {/* Manual save button */}
                                <button
                                    onClick={async () => {
                                        if (uid) {
                                            setSnapSaved(false);
                                            await syncNeuralSnap(uid, brainDump);
                                            setSnapSaved(true);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-1.5 rounded-2xl mono text-[10px] font-bold transition-all"
                                    style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", color: "#C9A84C" }}>
                                    ↓ Save Now
                                </button>
                            </div>
                        </div>
                        <textarea value={brainDump} onChange={e => setBrainDump(e.target.value)}
                            className="flex-1 bg-black/20 border border-white/8 rounded-[24px] p-6 text-sm text-white/70 outline-none resize-none leading-relaxed placeholder:text-white/10 transition-all"
                            style={{ minHeight: 160, fontFamily: "'JetBrains Mono', monospace" }}
                            placeholder="Start typing your thoughts..."
                            onFocus={e => e.target.style.borderColor = "rgba(24,95,165,0.4)"}
                            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.05)"}
                        />
                        <div className="mt-4 flex justify-between items-center mono text-[10px] text-white/20 uppercase tracking-[0.2em]">
                            <span>Astra Neural Archive v1.0</span>
                            <span className="italic" style={{ color: "rgba(201,168,76,0.3)" }}>Intelligence is the byproduct of organized chaos.</span>
                        </div>
                    </section>

                </div>
            </main>

            {/* ── ADD TASK MODAL ── */}
            {addModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}>
                    <div className="rounded-[32px] p-8 w-96" style={{ background: "#0C2D5E", border: "1px solid rgba(24,95,165,0.3)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black">New Objective</h3>
                            <button onClick={() => setAddModal(false)} className="text-white/30 hover:text-white transition-colors">✕</button>
                        </div>
                        {[
                            { label: "Title", field: "title", type: "text", ph: "Task name..." },
                            { label: "Subject", field: "subject", type: "text", ph: "Mathematics, Physics..." },
                            { label: "Time", field: "scheduledAt", type: "time", ph: "" },
                        ].map(f => (
                            <div key={f.field} className="mb-4">
                                <label className="mono text-[9px] text-white/30 uppercase tracking-[0.15em] block mb-1.5">{f.label}</label>
                                <input type={f.type} value={newTask[f.field]} placeholder={f.ph}
                                    onChange={e => setNewTask(p => ({ ...p, [f.field]: e.target.value }))}
                                    className="w-full mono text-xs px-4 py-2.5 rounded-2xl outline-none transition-all"
                                    style={{ background: "rgba(10,22,40,0.8)", border: "1px solid rgba(24,95,165,0.25)", color: "white" }} />
                            </div>
                        ))}
                        <div className="mb-6">
                            <label className="mono text-[9px] text-white/30 uppercase tracking-[0.15em] block mb-2">Energy Level</label>
                            <div className="flex gap-2">
                                {["Low", "Medium", "High"].map(e => {
                                    const ec = ENERGY_MAP[e];
                                    return (
                                        <button key={e} onClick={() => setNewTask(p => ({ ...p, energyLevel: e }))}
                                            className="flex-1 py-2 rounded-2xl mono text-[10px] font-bold transition-all"
                                            style={{
                                                background: newTask.energyLevel === e ? `${ec.color}22` : "transparent",
                                                border: `1px solid ${newTask.energyLevel === e ? ec.color : "rgba(24,95,165,0.2)"}`,
                                                color: newTask.energyLevel === e ? ec.color : "rgba(255,255,255,0.3)",
                                            }}>{ec.label} {e}</button>
                                    );
                                })}
                            </div>
                        </div>
                        <button onClick={handleAddTaskModal}
                            className="w-full py-3 rounded-2xl text-sm font-black tracking-wide transition-all"
                            style={{ background: "#185FA5", color: "white", boxShadow: "0 4px 20px rgba(24,95,165,0.4)" }}>
                            Deploy Objective
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}