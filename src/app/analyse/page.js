"use client";
import React, { useState, useEffect, useRef } from "react";
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
    PolarGrid, PolarAngleAxis, Radar
} from "recharts";

// ── DATA ──────────────────────────────────────────────────────────────────────
const weeklyData = [
    { day: "Mon", focus: 72, retention: 65, energy: 80, sessions: 3 },
    { day: "Tue", focus: 85, retention: 78, energy: 70, sessions: 4 },
    { day: "Wed", focus: 60, retention: 82, energy: 55, sessions: 2 },
    { day: "Thu", focus: 91, retention: 74, energy: 88, sessions: 5 },
    { day: "Fri", focus: 78, retention: 90, energy: 76, sessions: 4 },
    { day: "Sat", focus: 95, retention: 88, energy: 92, sessions: 6 },
    { day: "Sun", focus: 68, retention: 71, energy: 60, sessions: 2 },
];

const radarData = [
    { subject: "Focus", A: 85 },
    { subject: "Memory", A: 72 },
    { subject: "Speed", A: 90 },
    { subject: "Consistency", A: 68 },
    { subject: "Depth", A: 78 },
    { subject: "Recall", A: 82 },
];

const heatmapData = Array.from({ length: 7 * 12 }, (_, i) => ({
    day: i % 7,
    week: Math.floor(i / 7),
    value: Math.random(),
    subject: ["DSA", "OS", "DBMS", "Networks", "Maths", "Physics", "React"][Math.floor(Math.random() * 7)],
    hours: +(Math.random() * 6).toFixed(1),
}));

const aiLogs = [
    { time: "08:12", type: "SYSTEM", msg: "Concentration peak detected between 08:00–10:30." },
    { time: "09:45", type: "ANALYSIS", msg: "Retention for 'Data Structures' dropping 12% this week. Schedule review." },
    { time: "11:20", type: "PATTERN", msg: "You study 34% more efficiently after a 15-min break." },
    { time: "13:05", type: "ALERT", msg: "Physics session overdue by 2 days. Risk: exam gap forming." },
    { time: "14:30", type: "INSIGHT", msg: "Optimal deep-work window: 09:00–11:00 based on 14-day trend." },
    { time: "15:48", type: "SYSTEM", msg: "Weekly streak maintained. Consistency score: 82/100." },
    { time: "16:10", type: "ANALYSIS", msg: "React Patterns mastery at 68%. ETA to completion: 4 days at current velocity." },
    { time: "17:22", type: "PATTERN", msg: "Morning sessions yield 2.4x better recall than evening sessions." },
    { time: "18:00", type: "INSIGHT", msg: "Consider switching DBMS to morning slot for better retention." },
    { time: "19:15", type: "ALERT", msg: "Screen fatigue likely. Recommend 20-min break before next session." },
];

// ── SUBCOMPONENTS ─────────────────────────────────────────────────────────────

function WaveformBar({ active }) {
    const bars = 24;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 32 }}>
            {Array.from({ length: bars }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: 3,
                        borderRadius: 2,
                        background: "linear-gradient(to top, #00E5FF, #0088AA)",
                        animation: active ? `wave ${0.4 + (i % 5) * 0.15}s ease-in-out infinite alternate` : "none",
                        height: active ? `${20 + Math.sin(i * 0.8) * 14}px` : "6px",
                        opacity: active ? 0.8 + (i % 3) * 0.07 : 0.3,
                        transition: "height 0.3s ease",
                    }}
                />
            ))}
        </div>
    );
}

function HeatmapCell({ cell, onHover, hoveredCell }) {
    const intensity = cell.value;
    const isHovered = hoveredCell?.day === cell.day && hoveredCell?.week === cell.week;

    const getColor = (v) => {
        if (v < 0.15) return "rgba(12, 45, 94, 0.4)";
        if (v < 0.35) return "rgba(0, 100, 160, 0.5)";
        if (v < 0.55) return "rgba(0, 160, 200, 0.65)";
        if (v < 0.75) return "rgba(0, 210, 230, 0.8)";
        return "rgba(0, 229, 255, 0.95)";
    };

    return (
        <div
            onMouseEnter={() => onHover(cell)}
            onMouseLeave={() => onHover(null)}
            style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: getColor(intensity),
                border: isHovered ? "1.5px solid #00E5FF" : "1px solid rgba(0,229,255,0.08)",
                cursor: "pointer",
                transform: isHovered ? "scale(1.4)" : "scale(1)",
                transition: "transform 0.15s ease, border 0.15s ease",
                position: "relative",
                zIndex: isHovered ? 10 : 1,
                boxShadow: intensity > 0.6 ? `0 0 6px rgba(0,229,255,${intensity * 0.4})` : "none",
            }}
        />
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "rgba(10, 22, 40, 0.95)",
            border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: 12,
            padding: "10px 14px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
        }}>
            <p style={{ color: "#00E5FF", fontWeight: 600, marginBottom: 6 }}>{label}</p>
            {payload.map((p) => (
                <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
                    {p.name}: <span style={{ color: "#fff" }}>{p.value}</span>
                </p>
            ))}
        </div>
    );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AnalysisPage() {
    const [hoveredCell, setHoveredCell] = useState(null);
    const [activeMetric, setActiveMetric] = useState("focus");
    const [logVisible, setLogVisible] = useState([]);
    const [waveActive] = useState(true);
    const logRef = useRef(null);

    // Stream AI logs in one by one
    useEffect(() => {
        aiLogs.forEach((log, i) => {
            setTimeout(() => {
                setLogVisible((prev) => [...prev, log]);
                if (logRef.current) {
                    logRef.current.scrollTop = logRef.current.scrollHeight;
                }
            }, i * 600);
        });
    }, []);

    const typeColor = {
        SYSTEM: "#00E5FF",
        ANALYSIS: "#C9A84C",
        PATTERN: "#7C3AED",
        ALERT: "#EF4444",
        INSIGHT: "#10B981",
    };

    const metrics = [
        { key: "focus", label: "Focus", color: "#00E5FF" },
        { key: "retention", label: "Retention", color: "#C9A84C" },
        { key: "energy", label: "Energy", color: "#10B981" },
    ];

    return (
        <div style={{
            minHeight: "100vh",
            background: "#060D1A",
            color: "#fff",
            fontFamily: "'Space Grotesk', sans-serif",
            padding: "0 0 40px 0",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Cyber grid background */}
            <div style={{
                position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
                backgroundImage: `
          linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)
        `,
                backgroundSize: "40px 40px",
            }} />

            {/* Ambient glows */}
            <div style={{ position: "fixed", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,100,200,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "fixed", bottom: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulse { 0%,100%{box-shadow:0 0 8px rgba(0,229,255,0.4)} 50%{box-shadow:0 0 20px rgba(0,229,255,0.8)} }
        @keyframes scanline { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        .metric-btn:hover { background: rgba(0,229,255,0.08) !important; }
        .log-entry { animation: slideIn 0.3s ease forwards; }
        .rank-badge { animation: pulse 2s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 2px; }
      `}</style>

            <div style={{ position: "relative", zIndex: 1, maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>

                {/* ── PAGE HEADER ── */}
                <div style={{ padding: "28px 0 20px", borderBottom: "1px solid rgba(0,229,255,0.08)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <p style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(0,229,255,0.5)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 4 }}>
              // cognitive_analysis.exe
                        </p>
                        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                            Intelligence Overview
                        </h1>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: 100 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E5FF", animation: "pulse 2s infinite" }} />
                        <span style={{ fontSize: 11, color: "rgba(0,229,255,0.7)", fontFamily: "JetBrains Mono", letterSpacing: "0.1em" }}>LIVE SYNC</span>
                    </div>
                </div>

                {/* ── TICKER ROW ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>

                    {/* Ticker 1: Active Focus Waveform */}
                    <div style={{ padding: "18px 20px", background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.12)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
                        <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 10 }}>Active Mental Load</p>
                        <WaveformBar active={waveActive} />
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: "#00E5FF" }}>87<span style={{ fontSize: 12, opacity: 0.5 }}>/100</span></span>
                            <span style={{ fontSize: 10, color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 100, fontFamily: "JetBrains Mono" }}>PEAK ZONE</span>
                        </div>
                    </div>

                    {/* Ticker 2: Predictive Milestone */}
                    <div style={{ padding: "18px 20px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
                        <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(201,168,76,0.5)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 10 }}>Predictive Milestone</p>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 10 }}>
                            At current velocity, you will master{" "}
                            <span style={{ color: "#C9A84C", fontWeight: 600 }}>'React Patterns'</span>{" "}
                            in <span style={{ color: "#C9A84C", fontWeight: 700 }}>4 days</span>.
                        </p>
                        <div style={{ height: 3, background: "rgba(201,168,76,0.1)", borderRadius: 2 }}>
                            <div style={{ height: "100%", width: "68%", background: "linear-gradient(90deg, #C9A84C, #F0C040)", borderRadius: 2 }} />
                        </div>
                        <p style={{ fontSize: 10, color: "rgba(201,168,76,0.5)", marginTop: 4, fontFamily: "JetBrains Mono" }}>68% complete</p>
                    </div>

                    {/* Ticker 3: Global Rank */}
                    <div style={{ padding: "18px 20px", background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, backdropFilter: "blur(12px)", position: "relative", overflow: "hidden" }}>
                        <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(124,58,237,0.6)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 10 }}>Community Rank</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div className="rank-badge" style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ fontSize: 16, fontWeight: 800 }}>#47</span>
                            </div>
                            <div>
                                <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Top 5%</p>
                                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono", margin: "2px 0 0" }}>of 2,841 students</p>
                            </div>
                        </div>
                        <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 10, color: "rgba(124,58,237,0.5)", fontFamily: "JetBrains Mono" }}>↑ 12 this week</div>
                    </div>
                </div>

                {/* ── MAIN GRID ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 20 }}>

                    {/* ── COGNITIVE MAP ── */}
                    <div style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 20, padding: "24px", backdropFilter: "blur(20px)", position: "relative", overflow: "hidden" }}>
                        {/* Cyber grid overlay on chart */}
                        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,229,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.015) 1px,transparent 1px)", backgroundSize: "30px 30px", pointerEvents: "none", borderRadius: 20 }} />

                        <div style={{ position: "relative", zIndex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <div>
                                    <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 4 }}>Cognitive Map</p>
                                    <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Weekly Performance Matrix</h2>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    {metrics.map((m) => (
                                        <button
                                            key={m.key}
                                            className="metric-btn"
                                            onClick={() => setActiveMetric(m.key)}
                                            style={{
                                                padding: "5px 12px", borderRadius: 100, border: `1px solid ${activeMetric === m.key ? m.color : "rgba(255,255,255,0.08)"}`,
                                                background: activeMetric === m.key ? `${m.color}18` : "transparent",
                                                color: activeMetric === m.key ? m.color : "rgba(255,255,255,0.4)",
                                                fontSize: 11, cursor: "pointer", fontFamily: "JetBrains Mono", transition: "all 0.2s",
                                            }}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                    <defs>
                                        <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <filter id="glow">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                        </filter>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.05)" />
                                    <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    {activeMetric === "focus" && (
                                        <Area type="monotone" dataKey="focus" stroke="#00E5FF" strokeWidth={2.5} fill="url(#focusGrad)" filter="url(#glow)" dot={{ fill: "#00E5FF", r: 4, strokeWidth: 0 }} activeDot={{ r: 7, fill: "#00E5FF", filter: "url(#glow)" }} />
                                    )}
                                    {activeMetric === "retention" && (
                                        <Area type="monotone" dataKey="retention" stroke="#C9A84C" strokeWidth={2.5} fill="url(#retentionGrad)" filter="url(#glow)" dot={{ fill: "#C9A84C", r: 4, strokeWidth: 0 }} activeDot={{ r: 7, fill: "#C9A84C", filter: "url(#glow)" }} />
                                    )}
                                    {activeMetric === "energy" && (
                                        <Area type="monotone" dataKey="energy" stroke="#10B981" strokeWidth={2.5} fill="url(#energyGrad)" filter="url(#glow)" dot={{ fill: "#10B981", r: 4, strokeWidth: 0 }} activeDot={{ r: 7, fill: "#10B981", filter: "url(#glow)" }} />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ── RADAR CHART ── */}
                    <div style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 20, padding: "24px", backdropFilter: "blur(20px)" }}>
                        <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 4 }}>Skill Radar</p>
                        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Cognitive Profile</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="rgba(0,229,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "JetBrains Mono" }} />
                                <Radar name="Score" dataKey="A" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.12} strokeWidth={1.5} />
                            </RadarChart>
                        </ResponsiveContainer>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                            {radarData.map((r) => (
                                <div key={r.subject} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "rgba(0,229,255,0.03)", borderRadius: 8, border: "1px solid rgba(0,229,255,0.06)" }}>
                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "JetBrains Mono" }}>{r.subject}</span>
                                    <span style={{ fontSize: 11, color: "#00E5FF", fontWeight: 600, fontFamily: "JetBrains Mono" }}>{r.A}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── HEATMAP + AI SIDEBAR ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 20 }}>

                    {/* Deep-Work Heatmap */}
                    <div style={{ background: "rgba(6,13,26,0.8)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 20, padding: "24px", backdropFilter: "blur(20px)" }}>
                        <div style={{ marginBottom: 18 }}>
                            <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 4 }}>Deep-Work Heatmap</p>
                            <h2 style={{ fontSize: 17, fontWeight: 600 }}>12-Week Study Intensity</h2>
                        </div>

                        {/* Hover popup */}
                        {hoveredCell && (
                            <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 10, fontFamily: "JetBrains Mono", fontSize: 11, display: "flex", gap: 20 }}>
                                <span style={{ color: "rgba(255,255,255,0.5)" }}>Subject: <span style={{ color: "#00E5FF" }}>{hoveredCell.subject}</span></span>
                                <span style={{ color: "rgba(255,255,255,0.5)" }}>Hours: <span style={{ color: "#C9A84C" }}>{hoveredCell.hours}h</span></span>
                                <span style={{ color: "rgba(255,255,255,0.5)" }}>Intensity: <span style={{ color: "#10B981" }}>{Math.round(hoveredCell.value * 100)}%</span></span>
                            </div>
                        )}

                        {/* Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 4 }}>
                            {heatmapData.map((cell, i) => (
                                <HeatmapCell key={i} cell={cell} onHover={setHoveredCell} hoveredCell={hoveredCell} />
                            ))}
                        </div>

                        {/* Legend */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono" }}>Less</span>
                            {[0.1, 0.3, 0.5, 0.7, 0.95].map((v, i) => {
                                const colors = ["rgba(12,45,94,0.4)", "rgba(0,100,160,0.5)", "rgba(0,160,200,0.65)", "rgba(0,210,230,0.8)", "rgba(0,229,255,0.95)"];
                                return <div key={i} style={{ width: 14, height: 14, borderRadius: 4, background: colors[i] }} />;
                            })}
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "JetBrains Mono" }}>More</span>
                        </div>
                    </div>

                    {/* Neural Sidebar — AI Log */}
                    <div style={{ background: "rgba(2,8,16,0.95)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 20, padding: "20px", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column" }}>
                        <div style={{ marginBottom: 14 }}>
                            <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(0,229,255,0.4)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 4 }}>Neural Sidebar</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>AI Observation Log</h2>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                            </div>
                        </div>

                        <div ref={logRef} style={{ flex: 1, overflowY: "auto", maxHeight: 300, display: "flex", flexDirection: "column", gap: 6 }}>
                            {logVisible.map((log, i) => (
                                <div key={i} className="log-entry" style={{ padding: "8px 10px", background: "rgba(0,229,255,0.02)", borderRadius: 8, borderLeft: `2px solid ${typeColor[log.type] || "#00E5FF"}` }}>
                                    <div style={{ display: "flex", gap: 8, marginBottom: 3, alignItems: "center" }}>
                                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "JetBrains Mono" }}>{log.time}</span>
                                        <span style={{ fontSize: 9, color: typeColor[log.type], fontFamily: "JetBrains Mono", fontWeight: 600, letterSpacing: "0.08em" }}>[{log.type}]</span>
                                    </div>
                                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "JetBrains Mono", lineHeight: 1.5, margin: 0 }}>{log.msg}</p>
                                </div>
                            ))}
                            {logVisible.length < aiLogs.length && (
                                <div style={{ fontSize: 11, color: "rgba(0,229,255,0.4)", fontFamily: "JetBrains Mono", display: "flex", gap: 4, alignItems: "center" }}>
                                    <span style={{ animation: "blink 1s infinite" }}>█</span> analyzing...
                                </div>
                            )}
                        </div>

                        {/* Gemini badge */}
                        <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 10, display: "flex", gap: 8, alignItems: "center" }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: "linear-gradient(135deg, #4285F4, #00E5FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>✦</div>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 600, margin: 0, color: "rgba(255,255,255,0.8)" }}>Powered by Gemini 1.5 Flash</p>
                                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", margin: 0, fontFamily: "JetBrains Mono" }}>Real-time pattern analysis</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── BOTTOM STATS ROW ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {[
                        { label: "Study Streak", value: "14", unit: "days", color: "#C9A84C", sub: "Personal best: 21 days" },
                        { label: "Total Hours", value: "127", unit: "hrs", color: "#00E5FF", sub: "This semester" },
                        { label: "Topics Mastered", value: "23", unit: "/40", color: "#10B981", sub: "57% complete" },
                        { label: "Avg Focus Score", value: "81", unit: "%", color: "#7C3AED", sub: "↑ 8% from last week" },
                    ].map((stat) => (
                        <div key={stat.label} style={{ padding: "18px 20px", background: "rgba(6,13,26,0.8)", border: "1px solid rgba(0,229,255,0.08)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
                            <p style={{ fontSize: 10, letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 8 }}>{stat.label}</p>
                            <p style={{ fontSize: 28, fontWeight: 700, color: stat.color, margin: 0, lineHeight: 1 }}>
                                {stat.value}<span style={{ fontSize: 14, opacity: 0.5 }}>{stat.unit}</span>
                            </p>
                            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6, fontFamily: "JetBrains Mono" }}>{stat.sub}</p>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}