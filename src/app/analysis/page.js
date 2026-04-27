"use client";
import React, { useState, useEffect, useRef } from "react";
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import Sidebar from "@/components/shared/sidebar";
import { useAuth } from "@/context/authContext";
import {
    getSessionsInRange, aggregateByDay, fillDateGaps,
    formatDateLabel, getDateRange, getUserStats, getAILogs,
    buildHeatmap, computeRadarData, subscribeToStats,
    subscribeToSessions, generateAndSaveAILogs,
    computeTimeOfDayStats, computeConsistencyScore,
} from "@/lib/services/analysisService";

// ── THEME ─────────────────────────────────────────────────────────────────────
const T = {
    bg: "#0A1628", primary: "#0C2D5E", accent: "#185FA5",
    gold: "#C9A84C", white: "#FFFFFF",
    border: "rgba(24,95,165,0.18)", borderGold: "rgba(201,168,76,0.25)",
    muted: "rgba(245,240,232,0.35)", dim: "rgba(245,240,232,0.15)",
};

// ── FALLBACKS ─────────────────────────────────────────────────────────────────
const FB_CHART = [
    { date: "Mon", hours: 3.5, focusScore: 72, retention: 65, energy: 80, sessions: 3 },
    { date: "Tue", hours: 4.2, focusScore: 85, retention: 78, energy: 70, sessions: 4 },
    { date: "Wed", hours: 2.1, focusScore: 60, retention: 82, energy: 55, sessions: 2 },
    { date: "Thu", hours: 5.0, focusScore: 91, retention: 74, energy: 88, sessions: 5 },
    { date: "Fri", hours: 3.8, focusScore: 78, retention: 90, energy: 76, sessions: 4 },
    { date: "Sat", hours: 6.1, focusScore: 95, retention: 88, energy: 92, sessions: 6 },
    { date: "Sun", hours: 2.5, focusScore: 68, retention: 71, energy: 60, sessions: 2 },
];
const FB_STATS = { streak: 0, totalHours: 0, topicsMastered: 0, totalTopics: 40, avgFocusScore: 0, globalRank: null };
const FB_RADAR = [
    { subject: "Focus", A: 0 }, { subject: "Memory", A: 0 },
    { subject: "Speed", A: 0 }, { subject: "Consistency", A: 0 },
    { subject: "Depth", A: 0 }, { subject: "Recall", A: 0 },
];
const FB_LOGS = [
    { time: "08:12", type: "SYSTEM", msg: "Concentration peak detected between 08:00–10:30." },
    { time: "09:45", type: "ANALYSIS", msg: "Retention for 'Data Structures' dropping 12%. Schedule review." },
    { time: "11:20", type: "PATTERN", msg: "You study 34% more efficiently after a 15-min break." },
    { time: "13:05", type: "ALERT", msg: "Physics session overdue by 2 days. Risk: exam gap forming." },
    { time: "14:30", type: "INSIGHT", msg: "Optimal deep-work window: 09:00–11:00 based on 14-day trend." },
    { time: "16:10", type: "ANALYSIS", msg: "React Patterns mastery at 68%. ETA: 4 days at current velocity." },
    { time: "17:22", type: "PATTERN", msg: "Morning sessions yield 2.4x better recall than evenings." },
];

const LOG_COLORS = {
    SYSTEM: T.accent, ANALYSIS: T.gold,
    PATTERN: "#7C3AED", ALERT: "#EF4444", INSIGHT: "#10B981",
};

const RANGE_OPTIONS = [
    { key: "week", label: "7D" },
    { key: "month", label: "1M" },
    { key: "3months", label: "3M" },
    { key: "year", label: "1Y" },
];

const METRIC_OPTIONS = [
    { key: "hours", label: "Study Hours", color: T.gold },
    { key: "focusScore", label: "Focus", color: "#00C8FF" },
    { key: "retention", label: "Retention", color: "#10B981" },
    { key: "energy", label: "Energy", color: "#A78BFA" },
];

// ── HEATMAP ───────────────────────────────────────────────────────────────────
function buildHeatmapGrid(heatmap) {
    const weeks = 16;
    const cells = [];
    const today = new Date();
    for (let w = weeks - 1; w >= 0; w--) {
        for (let d = 0; d < 7; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (w * 7 + (6 - d)));
            const key = date.toISOString().split("T")[0];
            cells.push({ date: key, hours: heatmap[key] || 0 });
        }
    }
    return cells;
}

function heatColor(h) {
    if (h === 0) return "rgba(12,45,94,0.45)";
    if (h < 1) return "rgba(24,95,165,0.45)";
    if (h < 2) return "rgba(24,95,165,0.7)";
    if (h < 3.5) return "rgba(0,180,220,0.75)";
    if (h < 5) return "rgba(0,210,240,0.88)";
    return "rgba(201,168,76,0.95)";
}

function HeatmapGrid({ cells, hoveredCell, onHover }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: 4 }}>
            {cells.map((cell, i) => {
                const isHov = hoveredCell?.date === cell.date;
                return (
                    <div key={i}
                        onMouseEnter={() => onHover(cell)}
                        onMouseLeave={() => onHover(null)}
                        style={{
                            width: "100%", paddingBottom: "100%", borderRadius: 4,
                            background: heatColor(cell.hours),
                            border: isHov ? `1.5px solid ${T.gold}` : "1px solid rgba(24,95,165,0.1)",
                            transform: isHov ? "scale(1.35)" : "scale(1)",
                            transition: "transform 0.15s ease",
                            position: "relative", zIndex: isHov ? 10 : 1,
                            boxShadow: cell.hours > 3 ? "0 0 6px rgba(0,200,255,0.3)" : "none",
                            cursor: "pointer",
                        }}
                    />
                );
            })}
        </div>
    );
}

// ── WAVEFORM ──────────────────────────────────────────────────────────────────
function WaveformBar() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 30 }}>
            {Array.from({ length: 22 }).map((_, i) => (
                <div key={i} style={{
                    width: 3, borderRadius: 2,
                    background: `linear-gradient(to top, ${T.accent}, #00C8FF)`,
                    animation: `wave ${0.4 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                    height: `${16 + Math.sin(i * 0.9) * 12}px`,
                    opacity: 0.75 + (i % 3) * 0.08,
                }} />
            ))}
        </div>
    );
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: T.primary, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>
            <p style={{ color: T.gold, fontWeight: 700, marginBottom: 6 }}>{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
                    {p.name}: <span style={{ color: T.white }}>{p.value}</span>
                </p>
            ))}
        </div>
    );
}

// ── CARD ──────────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
    return (
        <div style={{ background: T.primary + "55", border: `1px solid ${T.border}`, borderRadius: 20, padding: 24, backdropFilter: "blur(16px)", ...style }}>
            {children}
        </div>
    );
}

function SectionLabel({ text }) {
    return <p style={{ fontSize: 9, letterSpacing: "0.22em", color: T.muted, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>{text}</p>;
}

function formatLogTime(log) {
    if (log.time) return log.time; // old format or FB_LOGS fallback
    if (log.createdAt?.toDate) {
        const d = log.createdAt.toDate();
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "--:--";
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AnalysisPage() {
    const { user } = useAuth();
    const uid = user?.uid;

    const [range, setRange] = useState("week");
    const [metric, setMetric] = useState("hours");
    const [chartData, setChartData] = useState(FB_CHART);
    const [stats, setStats] = useState(FB_STATS);
    const [radarData, setRadarData] = useState(FB_RADAR);
    const [aiLogs, setAiLogs] = useState([]);
    const [visibleLogs, setVisibleLogs] = useState([]);
    const [heatmap, setHeatmap] = useState({});
    const [hoveredCell, setHoveredCell] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasData, setHasData] = useState(false);
    const logRef = useRef(null);
    const [consistencyScore, setConsistencyScore] = useState(0);
    const [timeStats, setTimeStats] = useState(null);

    const [logsLoading, setLogsLoading] = useState(false);

    const loadLogs = async (force = false) => {
        if (!uid) { setAiLogs(FB_LOGS); return; }
        setLogsLoading(true);
        try {
            // Try to generate fresh logs (respects daily cache unless forced)
            await generateAndSaveAILogs(uid, force);
            const logs = await getAILogs(uid, 15);
            setAiLogs(logs.length ? logs : FB_LOGS);
        } catch {
            setAiLogs(FB_LOGS);
        }
        setLogsLoading(false);
    };

    useEffect(() => {
        loadLogs(false);
    }, [uid])

    // ── Real-time stats listener ───────────────────────────────────────────
    useEffect(() => {
        if (!uid) return;
        return subscribeToStats(uid, s => {
            setStats(prev => ({ ...prev, ...s }));
        });
    }, [uid]);

    // ── Real-time sessions → heatmap ───────────────────────────────────────
    useEffect(() => {
        if (!uid) return;
        return subscribeToSessions(uid, sessions => {
            if (sessions.length) {
                setHasData(true);
                setHeatmap(buildHeatmap(sessions));
            }
        });
    }, [uid]);

    // ── Fetch chart data when range changes ────────────────────────────────
    useEffect(() => {
        if (!uid) return;
        (async () => {
            setLoading(true);
            try {
                const { from, to } = getDateRange(range);
                const sessions = await getSessionsInRange(uid, from, to);
                if (sessions.length) {
                    const agg = aggregateByDay(sessions);
                    const filled = fillDateGaps(agg, from, to);
                    setChartData(filled.map(d => ({ ...d, date: formatDateLabel(d.date, range) })));
                    setHasData(true);
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, [uid, range]);

    // ── Compute radar from real data ───────────────────────────────────────
    useEffect(() => {
        if (!uid) return;
        computeRadarData(uid).then(data => {
            if (data) setRadarData(data);
        });
    }, [uid]);

    // ── Fetch AI logs ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!uid) { setAiLogs(FB_LOGS); return; }
        getAILogs(uid, 15)
            .then(logs => setAiLogs(logs.length ? logs : FB_LOGS))
            .catch(() => setAiLogs(FB_LOGS));
    }, [uid]);

    // ── Stream AI logs in one by one ───────────────────────────────────────
    useEffect(() => {
        setVisibleLogs([]);
        aiLogs.forEach((log, i) => {
            setTimeout(() => {
                setVisibleLogs(prev => [...prev, log]);
                if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
            }, i * 350);
        });
    }, [aiLogs]);

    const heatCells = buildHeatmapGrid(heatmap);
    const activeMetricCfg = METRIC_OPTIONS.find(m => m.key === metric);

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.white, fontFamily: "'Space Grotesk', sans-serif" }}>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
                @keyframes wave     { from{transform:scaleY(0.35)} to{transform:scaleY(1)} }
                @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes slideIn  { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
                @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }
                .log-entry  { animation: slideIn 0.3s ease forwards; }
                .range-btn:hover  { background: rgba(24,95,165,0.15) !important; }
                .metric-btn:hover { opacity: 0.9; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-thumb { background: rgba(24,95,165,0.3); border-radius: 2px; }
            `}</style>

            <Sidebar activePage="analysis" />

            <main style={{ flex: 1, marginLeft: 256, padding: "28px 28px 40px", minWidth: 0 }}>

                {/* ── HEADER ── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: `1px solid ${T.border}`, paddingBottom: 20 }}>
                    <div>
                        <p style={{ fontSize: 9, letterSpacing: "0.22em", color: T.muted, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>// cognitive_analysis.exe</p>
                        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Intelligence Overview</h1>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {!hasData && (
                            <span style={{ fontSize: 10, color: T.gold, fontFamily: "monospace", background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.2)`, padding: "4px 10px", borderRadius: 100 }}>
                                showing sample data — start a focus session to see real stats
                            </span>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", background: "rgba(24,95,165,0.1)", border: `1px solid ${T.border}`, borderRadius: 100 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: hasData ? "#10B981" : T.gold, animation: "pulseDot 2s infinite" }} />
                            <span style={{ fontSize: 10, color: T.muted, fontFamily: "monospace", letterSpacing: "0.1em" }}>{hasData ? "LIVE SYNC" : "NO DATA YET"}</span>
                        </div>
                    </div>
                </div>

                {/* ── TICKER ROW ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>

                    {/* Mental Load */}
                    <Card>
                        <SectionLabel text="Active Mental Load" />
                        <WaveformBar />
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 24, fontWeight: 700, color: "#00C8FF" }}>
                                {stats.avgFocusScore || 0}<span style={{ fontSize: 12, color: T.muted }}>/100</span>
                            </span>
                            <span style={{ fontSize: 10, color: "#10B981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", padding: "3px 10px", borderRadius: 100, fontFamily: "monospace" }}>
                                {stats.avgFocusScore >= 80 ? "PEAK ZONE" : stats.avgFocusScore >= 60 ? "GOOD" : "BUILDING"}
                            </span>
                        </div>
                    </Card>

                    {/* Streak / Predictive */}
                    <Card style={{ borderColor: T.borderGold }}>
                        <SectionLabel text="Study Streak" />
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 36, fontWeight: 800, color: T.gold, lineHeight: 1 }}>{stats.streak || 0}</span>
                            <span style={{ fontSize: 14, color: T.muted, marginBottom: 4 }}>days</span>
                        </div>
                        <div style={{ height: 3, background: "rgba(201,168,76,0.12)", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: `${Math.min(100, ((stats.streak || 0) / 30) * 100)}%`, background: `linear-gradient(90deg, ${T.gold}, #F0C040)`, borderRadius: 2 }} />
                        </div>
                        <p style={{ fontSize: 10, color: T.muted, marginTop: 5, fontFamily: "monospace" }}>
                            {stats.streak >= 7 ? "🔥 Week streak! Keep going." : stats.streak >= 3 ? "Building momentum." : "Start a session to begin your streak."}
                        </p>
                    </Card>

                    {/* Total Hours */}
                    <Card style={{ borderColor: "rgba(124,58,237,0.25)" }}>
                        <SectionLabel text="Total Study Hours" />
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 36, fontWeight: 800, color: "#A78BFA", lineHeight: 1 }}>{stats.totalHours || 0}</span>
                            <span style={{ fontSize: 14, color: T.muted, marginBottom: 4 }}>hrs</span>
                        </div>
                        <p style={{ fontSize: 10, color: "rgba(124,58,237,0.6)", fontFamily: "monospace", marginTop: 4 }}>
                            Avg focus: {stats.avgFocusScore || 0}% · {stats.streak || 0} day streak
                        </p>
                    </Card>
                </div>

                {/* ── MAIN CHART + RADAR ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 16 }}>

                    {/* Cognitive Map */}
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                            <div>
                                <SectionLabel text="Cognitive Map" />
                                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Performance Matrix</h2>
                            </div>
                            <div style={{ display: "flex", gap: 4, background: "rgba(12,45,94,0.6)", padding: 4, borderRadius: 10, border: `1px solid ${T.border}` }}>
                                {RANGE_OPTIONS.map(r => (
                                    <button key={r.key} className="range-btn" onClick={() => setRange(r.key)} style={{
                                        padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "monospace", transition: "all 0.2s",
                                        background: range === r.key ? T.accent : "transparent",
                                        color: range === r.key ? T.white : T.muted,
                                    }}>{r.label}</button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                            {METRIC_OPTIONS.map(m => (
                                <button key={m.key} className="metric-btn" onClick={() => setMetric(m.key)} style={{
                                    padding: "4px 12px", borderRadius: 100,
                                    border: `1px solid ${metric === m.key ? m.color : T.border}`,
                                    background: metric === m.key ? `${m.color}20` : "transparent",
                                    color: metric === m.key ? m.color : T.muted,
                                    fontSize: 11, cursor: "pointer", fontFamily: "monospace", transition: "all 0.2s",
                                }}>{m.label}</button>
                            ))}
                        </div>

                        {loading ? (
                            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontFamily: "monospace", fontSize: 12 }}>
                                <span style={{ animation: "blink 1s infinite" }}>█</span>&nbsp;loading data...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 5, bottom: 0, left: -20 }}>
                                    <defs>
                                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={activeMetricCfg.color} stopOpacity={0.35} />
                                            <stop offset="100%" stopColor={activeMetricCfg.color} stopOpacity={0} />
                                        </linearGradient>
                                        <filter id="glow">
                                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                        </filter>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,95,165,0.08)" />
                                    <XAxis dataKey="date" tick={{ fill: T.muted, fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} interval={range === "year" ? 30 : range === "3months" ? 6 : "preserveStartEnd"} />
                                    <YAxis tick={{ fill: T.muted, fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey={metric} stroke={activeMetricCfg.color} strokeWidth={2.5} fill="url(#areaGrad)" filter="url(#glow)" dot={false} activeDot={{ r: 6, fill: activeMetricCfg.color }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    {/* Radar — now computed from real data */}
                    <Card>
                        <SectionLabel text="Skill Radar" />
                        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Cognitive Profile</h2>
                        <p style={{ fontSize: 10, color: T.muted, fontFamily: "monospace", marginBottom: 12 }}>
                            {hasData ? "Computed from your sessions" : "Start sessions to compute"}
                        </p>
                        <ResponsiveContainer width="100%" height={180}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke={T.border} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: T.muted, fontSize: 10, fontFamily: "monospace" }} />
                                <Radar name="Score" dataKey="A" stroke={T.accent} fill={T.accent} fillOpacity={0.15} strokeWidth={1.5} />
                            </RadarChart>
                        </ResponsiveContainer>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                            {radarData.map(r => (
                                <div key={r.subject} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: "rgba(12,45,94,0.5)", borderRadius: 8, border: `1px solid ${T.border}` }}>
                                    <span style={{ fontSize: 11, color: T.muted, fontFamily: "monospace" }}>{r.subject}</span>
                                    <span style={{ fontSize: 11, color: T.accent, fontWeight: 700, fontFamily: "monospace" }}>{r.A}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* ── HEATMAP + AI LOG ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 16 }}>

                    <Card>
                        <SectionLabel text="Deep-Work Heatmap" />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>16-Week Study Intensity</h2>
                            {hoveredCell && (
                                <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "monospace", color: T.muted }}>
                                    <span>{hoveredCell.date}</span>
                                    <span style={{ color: T.gold }}>{hoveredCell.hours.toFixed(1)} hrs</span>
                                </div>
                            )}
                        </div>
                        <HeatmapGrid cells={heatCells} hoveredCell={hoveredCell} onHover={setHoveredCell} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, justifyContent: "flex-end" }}>
                            <span style={{ fontSize: 9, color: T.dim, fontFamily: "monospace" }}>less</span>
                            {["rgba(12,45,94,0.45)", "rgba(24,95,165,0.45)", "rgba(24,95,165,0.7)", "rgba(0,180,220,0.75)", "rgba(0,210,240,0.88)", "rgba(201,168,76,0.95)"].map((c, i) => (
                                <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                            ))}
                            <span style={{ fontSize: 9, color: T.dim, fontFamily: "monospace" }}>more</span>
                        </div>
                    </Card>

                    {/* AI Observation Log */}
                    <Card style={{ background: "rgba(6,13,26,0.9)", display: "flex", flexDirection: "column" }}>
                        <div style={{ marginBottom: 14 }}>
                            <SectionLabel text="Neural Sidebar" />
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>AI Observation Log</h2>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", animation: "pulseDot 1.5s infinite" }} />
                                </div>
                                <button
                                    onClick={() => loadLogs(true)}
                                    disabled={logsLoading}
                                    style={{
                                        fontSize: 10, padding: "3px 10px", borderRadius: 100, cursor: "pointer",
                                        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                                        color: logsLoading ? T.dim : "#10B981", fontFamily: "monospace",
                                        transition: "all 0.2s",
                                    }}>
                                    {logsLoading ? "Analysing..." : "↻ Refresh"}
                                </button>
                            </div>
                        </div>
                        <div ref={logRef} style={{ flex: 1, overflowY: "auto", maxHeight: 280, display: "flex", flexDirection: "column", gap: 6 }}>
                            {visibleLogs.map((log, i) => (
                                <div key={i} className="log-entry" style={{ padding: "8px 10px", background: "rgba(12,45,94,0.3)", borderRadius: 8, borderLeft: `2px solid ${LOG_COLORS[log.type] || T.accent}` }}>
                                    <div style={{ display: "flex", gap: 8, marginBottom: 3, alignItems: "center" }}>
                                        <span style={{ fontSize: 9, color: T.dim, fontFamily: "monospace" }}>{formatLogTime(log)}</span>
                                        <span style={{ fontSize: 9, color: LOG_COLORS[log.type], fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.06em" }}>[{log.type}]</span>
                                    </div>
                                    <p style={{ fontSize: 11, color: "rgba(245,240,232,0.65)", fontFamily: "monospace", lineHeight: 1.55, margin: 0 }}>{log.msg}</p>
                                </div>
                            ))}
                            {visibleLogs.length < aiLogs.length && (
                                <div style={{ fontSize: 11, color: T.muted, fontFamily: "monospace", display: "flex", gap: 4, alignItems: "center" }}>
                                    <span style={{ animation: "blink 1s infinite" }}>█</span> analyzing...
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(24,95,165,0.08)", border: `1px solid ${T.border}`, borderRadius: 10, display: "flex", gap: 10, alignItems: "center" }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, #4285F4, ${T.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✦</div>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 600, margin: 0, color: "rgba(245,240,232,0.8)" }}>Powered by Gemini 2.0 Flash</p>
                                <p style={{ fontSize: 9, color: T.dim, margin: 0, fontFamily: "monospace" }}>Real-time pattern analysis</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* ── BOTTOM STATS — 6 cards ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 16 }}>

                    {/* Existing 4 cards — keep as-is */}
                    {[
                        { label: "Study Streak", value: stats.streak || 0, unit: "days", color: T.gold, sub: stats.streak >= 7 ? "🔥 Week streak!" : "Keep going daily" },
                        { label: "Total Hours", value: stats.totalHours || 0, unit: "hrs", color: "#00C8FF", sub: "All time" },
                        { label: "Topics Mastered", value: `${stats.topicsMastered || 0}/${stats.totalTopics || 40}`, unit: "", color: "#10B981", sub: `${Math.round(((stats.topicsMastered || 0) / (stats.totalTopics || 40)) * 100)}% complete` },
                        { label: "Avg Focus Score", value: stats.avgFocusScore || 0, unit: "%", color: "#A78BFA", sub: stats.avgFocusScore >= 80 ? "Excellent" : "Keep improving" },
                    ].map(stat => (
                        <Card key={stat.label} style={{ padding: "18px 20px" }}>
                            <p style={{ fontSize: 9, letterSpacing: "0.18em", color: T.dim, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>{stat.label}</p>
                            <p style={{ fontSize: 26, fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>
                                {stat.value}<span style={{ fontSize: 13, opacity: 0.5 }}>{stat.unit}</span>
                            </p>
                            <p style={{ fontSize: 10, color: T.dim, marginTop: 6, fontFamily: "monospace" }}>{stat.sub}</p>
                        </Card>
                    ))}

                    {/* NEW — Consistency Score with ring */}
                    <Card style={{ padding: "18px 20px", display: "flex", gap: 16, alignItems: "center" }}>
                        {/* SVG ring */}
                        <svg width={64} height={64} style={{ flexShrink: 0 }}>
                            <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth={5} />
                            <circle cx={32} cy={32} r={26} fill="none"
                                stroke="#10B981" strokeWidth={5}
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={`${2 * Math.PI * 26 * (1 - consistencyScore / 100)}`}
                                strokeLinecap="round"
                                transform="rotate(-90 32 32)"
                                style={{ transition: "stroke-dashoffset 1s ease" }}
                            />
                            <text x={32} y={37} textAnchor="middle" fill="#10B981"
                                fontSize={13} fontWeight={700} fontFamily="monospace">
                                {consistencyScore}
                            </text>
                        </svg>
                        <div>
                            <p style={{ fontSize: 9, letterSpacing: "0.18em", color: T.dim, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>Consistency Score</p>
                            <p style={{ fontSize: 13, color: "#10B981", fontWeight: 700, marginBottom: 4 }}>
                                {consistencyScore >= 80 ? "Exceptional 🔥" : consistencyScore >= 60 ? "On Track ✓" : consistencyScore >= 40 ? "Building" : "Just Starting"}
                            </p>
                            <p style={{ fontSize: 10, color: T.dim, fontFamily: "monospace" }}>Based on last 14 days</p>
                        </div>
                    </Card>

                    {/* NEW — Best Study Window */}
                    <Card style={{ padding: "18px 20px" }}>
                        <p style={{ fontSize: 9, letterSpacing: "0.18em", color: T.dim, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Best Study Window</p>
                        {timeStats ? (
                            <>
                                <p style={{ fontSize: 18, fontWeight: 700, color: T.gold, margin: 0 }}>
                                    {timeStats.bestWindow}
                                </p>
                                <p style={{ fontSize: 10, color: T.dim, marginTop: 6, fontFamily: "monospace" }}>
                                    Avg focus: {timeStats.bestFocus}% in this window
                                </p>
                                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                                    {timeStats.windows.slice(0, 3).map(w => (
                                        <span key={w.label} style={{
                                            fontSize: 9, padding: "2px 7px", borderRadius: 100,
                                            background: w.label === timeStats.bestWindow ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
                                            border: `1px solid ${w.label === timeStats.bestWindow ? "rgba(201,168,76,0.4)" : T.border}`,
                                            color: w.label === timeStats.bestWindow ? T.gold : T.muted,
                                            fontFamily: "monospace",
                                        }}>{w.label.split(" ")[0]} {w.avgFocus}%</span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p style={{ fontSize: 12, color: T.dim, fontFamily: "monospace" }}>
                                Complete 3+ sessions to see your peak window
                            </p>
                        )}
                    </Card>

                </div>

            </main>
        </div>
    );
}