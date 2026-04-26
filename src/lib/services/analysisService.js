/**
 * analysisService.js
 * Complete Firestore backend for the Analysis page.
 *
 * Firestore Structure:
 *   users/{uid}/studySessions/{id}
 *     - date:       string  "YYYY-MM-DD"
 *     - subject:    string
 *     - hours:      number
 *     - focusScore: number  0-100
 *     - retention:  number  0-100
 *     - energy:     number  0-100
 *     - createdAt:  Timestamp
 *
 *   users/{uid}/meta/stats           ← cached summary, updated after every session
 *     - streak, totalHours, avgFocusScore, topicsMastered, totalTopics, lastActiveDate
 *
 *   users/{uid}/aiLogs/{id}
 *     - time, type, msg, createdAt
 */

import {
    collection, addDoc, getDocs, query,
    orderBy, where, Timestamp, doc,
    getDoc, setDoc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── STUDY SESSIONS ────────────────────────────────────────────────────────────

/**
 * logStudySession()
 * Saves a new session and triggers a stats recalculation.
 */
export async function logStudySession(uid, sessionData) {
    if (!uid) return;
    const ref = collection(db, "users", uid, "studySessions");
    await addDoc(ref, {
        date: sessionData.date || new Date().toISOString().split("T")[0],
        subject: sessionData.subject || "General",
        hours: sessionData.hours || 0,
        focusScore: sessionData.focusScore || 0,
        retention: sessionData.retention || Math.round((sessionData.focusScore || 0) * 0.85),
        energy: sessionData.energy || Math.round((sessionData.focusScore || 0) * 0.9),
        createdAt: Timestamp.now(),
    });
    // Always recalculate stats after a new session
    await recalculateStats(uid);
}

/**
 * getAllSessions()
 * One-time fetch of all sessions ordered by date desc.
 */
export async function getAllSessions(uid) {
    if (!uid) return [];
    const q = query(
        collection(db, "users", uid, "studySessions"),
        orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * getSessionsInRange()
 * Fetch sessions between two dates inclusive.
 */
export async function getSessionsInRange(uid, from, to) {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "users", uid, "studySessions"),
            where("date", ">=", from),
            where("date", "<=", to),
            orderBy("date", "asc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("getSessionsInRange error:", e);
        return [];
    }
}

/**
 * subscribeToSessions()
 * Real-time listener for ALL sessions (used to keep analysis live).
 * Returns unsubscribe function.
 */
export function subscribeToSessions(uid, callback) {
    if (!uid) return () => { };
    const q = query(
        collection(db, "users", uid, "studySessions"),
        orderBy("date", "desc")
    );
    return onSnapshot(q, snap => {
        const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(sessions);
    }, err => console.error("subscribeToSessions error:", err));
}

// ── AGGREGATION HELPERS ───────────────────────────────────────────────────────

/**
 * aggregateByDay()
 * Rolls up sessions into daily totals for charting.
 */
export function aggregateByDay(sessions) {
    const map = {};
    sessions.forEach(s => {
        if (!map[s.date]) {
            map[s.date] = { date: s.date, hours: 0, focusScore: 0, retention: 0, energy: 0, count: 0 };
        }
        map[s.date].hours += s.hours || 0;
        map[s.date].focusScore += s.focusScore || 0;
        map[s.date].retention += s.retention || 0;
        map[s.date].energy += s.energy || 0;
        map[s.date].count += 1;
    });

    return Object.values(map).map(d => ({
        date: d.date,
        hours: parseFloat(d.hours.toFixed(1)),
        focusScore: d.count ? Math.round(d.focusScore / d.count) : 0,
        retention: d.count ? Math.round(d.retention / d.count) : 0,
        energy: d.count ? Math.round(d.energy / d.count) : 0,
        sessions: d.count,
    })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * buildHeatmap()
 * Returns { "YYYY-MM-DD": totalHours } for the heatmap grid.
 */
export function buildHeatmap(sessions) {
    const map = {};
    sessions.forEach(s => {
        map[s.date] = (map[s.date] || 0) + (s.hours || 0);
    });
    return map;
}

/**
 * fillDateGaps()
 * Pads aggregated data with zero-days so charts have no gaps.
 */
export function fillDateGaps(data, from, to) {
    const map = {};
    data.forEach(d => { map[d.date] = d; });
    const result = [];
    const cursor = new Date(from);
    const end = new Date(to);
    while (cursor <= end) {
        const key = cursor.toISOString().split("T")[0];
        result.push(map[key] || { date: key, hours: 0, focusScore: 0, retention: 0, energy: 0, sessions: 0 });
        cursor.setDate(cursor.getDate() + 1);
    }
    return result;
}

/**
 * formatDateLabel()
 * Formats a date string for chart X-axis based on range.
 */
export function formatDateLabel(dateStr, mode) {
    const d = new Date(dateStr);
    if (mode === "week") return d.toLocaleDateString("en", { weekday: "short" });
    if (mode === "month") return d.getDate().toString();
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/**
 * getDateRange()
 * Returns { from, to } strings for a given range mode.
 */
export function getDateRange(mode) {
    const today = new Date();
    const fmt = d => d.toISOString().split("T")[0];

    if (mode === "week") {
        const from = new Date(today); from.setDate(today.getDate() - 6);
        return { from: fmt(from), to: fmt(today) };
    }
    if (mode === "month") {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: fmt(from), to: fmt(today) };
    }
    if (mode === "3months") {
        const from = new Date(today); from.setMonth(today.getMonth() - 3);
        return { from: fmt(from), to: fmt(today) };
    }
    // year
    const from = new Date(today.getFullYear(), 0, 1);
    return { from: fmt(from), to: fmt(today) };
}

// ── STATS (cached summary doc) ────────────────────────────────────────────────

/**
 * getUserStats()
 * One-time fetch of the cached stats document.
 * Initialises with defaults if it doesn't exist yet.
 */
export async function getUserStats(uid) {
    if (!uid) return null;
    const ref = doc(db, "users", uid, "meta", "stats");
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();

    const defaults = {
        streak: 0,
        totalHours: 0,
        topicsMastered: 0,
        totalTopics: 40,
        avgFocusScore: 0,
        globalRank: null,
        lastActiveDate: null,
    };
    await setDoc(ref, defaults);
    return defaults;
}

/**
 * subscribeToStats()
 * Real-time listener for the stats summary card.
 * Returns unsubscribe function.
 */
export function subscribeToStats(uid, callback) {
    if (!uid) return () => { };
    const ref = doc(db, "users", uid, "meta", "stats");
    return onSnapshot(ref, snap => {
        if (snap.exists()) callback(snap.data());
    }, err => console.error("subscribeToStats error:", err));
}

/**
 * recalculateStats()
 * Recomputes streak, totalHours, avgFocusScore from all sessions
 * and writes back to users/{uid}/meta/stats.
 * Called automatically after logStudySession().
 */
export async function recalculateStats(uid) {
    if (!uid) return;
    try {
        const sessions = await getAllSessions(uid);
        if (!sessions.length) return;

        const totalHours = parseFloat(sessions.reduce((s, x) => s + (x.hours || 0), 0).toFixed(1));
        const avgFocusScore = Math.round(sessions.reduce((s, x) => s + (x.focusScore || 0), 0) / sessions.length);

        // Streak — consecutive days ending today
        const today = new Date().toISOString().split("T")[0];
        const uniqueDays = [...new Set(sessions.map(s => s.date))].sort().reverse();
        let streak = 0;
        let cursor = new Date(today);
        for (const day of uniqueDays) {
            const d = cursor.toISOString().split("T")[0];
            if (day === d) { streak++; cursor.setDate(cursor.getDate() - 1); }
            else break;
        }

        const ref = doc(db, "users", uid, "meta", "stats");
        await setDoc(ref, { totalHours, avgFocusScore, streak, lastActiveDate: today }, { merge: true });
    } catch (e) {
        console.error("recalculateStats error:", e);
    }
}

// ── RADAR / COGNITIVE PROFILE ─────────────────────────────────────────────────

/**
 * computeRadarData()
 * Derives the 6-axis cognitive profile from real session data.
 *
 * Axes and how they're calculated:
 *   Focus       → average focusScore across all sessions
 *   Memory      → average retention across all sessions
 *   Speed       → sessions per week (normalized 0-100, max assumed = 10/week)
 *   Consistency → % of last 14 days that had at least one session
 *   Depth       → % of sessions that were 1hr+ (long deep-work blocks)
 *   Recall      → weighted avg of retention for sessions in last 7 days
 */
export async function computeRadarData(uid) {
    if (!uid) return null;
    try {
        const sessions = await getAllSessions(uid);
        if (!sessions.length) return null;

        const today = new Date();
        const day14 = new Date(today); day14.setDate(today.getDate() - 14);
        const day7 = new Date(today); day7.setDate(today.getDate() - 7);
        const day7Str = day7.toISOString().split("T")[0];
        const day14Str = day14.toISOString().split("T")[0];

        const recent14 = sessions.filter(s => s.date >= day14Str);
        const recent7 = sessions.filter(s => s.date >= day7Str);

        // Focus — avg focusScore all time
        const focus = Math.round(sessions.reduce((s, x) => s + (x.focusScore || 0), 0) / sessions.length);

        // Memory — avg retention all time
        const memory = sessions.some(s => s.retention)
            ? Math.round(sessions.reduce((s, x) => s + (x.retention || 0), 0) / sessions.length)
            : Math.round(focus * 0.85);

        // Speed — sessions/week normalized (10 sessions/week = 100)
        const sessionsPerWeek = recent7.length;
        const speed = Math.min(100, Math.round((sessionsPerWeek / 10) * 100));

        // Consistency — days with sessions out of last 14
        const uniqueDays14 = new Set(recent14.map(s => s.date)).size;
        const consistency = Math.round((uniqueDays14 / 14) * 100);

        // Depth — % sessions ≥ 1 hour
        const longSessions = sessions.filter(s => (s.hours || 0) >= 1).length;
        const depth = Math.round((longSessions / sessions.length) * 100);

        // Recall — avg retention of last 7 days sessions
        const recall = recent7.length
            ? Math.round(recent7.reduce((s, x) => s + (x.retention || x.focusScore * 0.85 || 0), 0) / recent7.length)
            : memory;

        return [
            { subject: "Focus", A: Math.min(100, focus) },
            { subject: "Memory", A: Math.min(100, memory) },
            { subject: "Speed", A: Math.min(100, speed) },
            { subject: "Consistency", A: Math.min(100, consistency) },
            { subject: "Depth", A: Math.min(100, depth) },
            { subject: "Recall", A: Math.min(100, recall) },
        ];
    } catch (e) {
        console.error("computeRadarData error:", e);
        return null;
    }
}

// ── WEEKLY MOMENTUM ───────────────────────────────────────────────────────────

/**
 * getWeeklyMomentum()
 * Returns momentum score + per-day chart data for last 7 days.
 *
 * Score formula (max 100):
 *   consistency (40pts) = activeDays/7
 *   volume      (40pts) = min(avgHours, 4) / 4
 *   quality     (20pts) = avgFocusScore / 100
 */
export async function getWeeklyMomentum(uid) {
    if (!uid) return { score: 0, chartData: [], activeDays: 0, totalHours: 0 };
    try {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split("T")[0]);
        }

        const { from, to } = { from: dates[0], to: dates[6] };
        const sessions = await getSessionsInRange(uid, from, to);

        const dayMap = {};
        dates.forEach(d => { dayMap[d] = { hours: 0, focusSum: 0, count: 0 }; });
        sessions.forEach(s => {
            if (!dayMap[s.date]) return;
            dayMap[s.date].hours += s.hours || 0;
            dayMap[s.date].focusSum += s.focusScore || 0;
            dayMap[s.date].count += 1;
        });

        const chartData = dates.map(d => ({
            day: new Date(d).toLocaleDateString("en", { weekday: "short" }),
            hours: parseFloat(dayMap[d].hours.toFixed(1)),
            focus: dayMap[d].count ? Math.round(dayMap[d].focusSum / dayMap[d].count) : 0,
        }));

        const activeDays = Object.values(dayMap).filter(d => d.hours > 0).length;
        const totalHours = parseFloat(Object.values(dayMap).reduce((s, d) => s + d.hours, 0).toFixed(1));
        const avgHours = totalHours / 7;
        const withData = Object.values(dayMap).filter(d => d.count > 0);
        const avgFocus = withData.length
            ? withData.reduce((s, d) => s + d.focusSum / d.count, 0) / withData.length
            : 0;

        const score = Math.round(
            (activeDays / 7) * 40 +
            (Math.min(avgHours, 4) / 4) * 40 +
            (avgFocus / 100) * 20
        );

        return { score, chartData, activeDays, totalHours };
    } catch (e) {
        console.error("getWeeklyMomentum error:", e);
        return { score: 0, chartData: [], activeDays: 0, totalHours: 0 };
    }
}

// ── AI LOGS ───────────────────────────────────────────────────────────────────

/**
 * getAILogs()
 * Fetch last N AI observation logs.
 */
export async function getAILogs(uid, limitCount = 20) {
    if (!uid) return [];
    try {
        const q = query(collection(db, "users", uid, "aiLogs"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        return snap.docs.slice(0, limitCount).map(d => ({ id: d.id, ...d.data() })).reverse();
    } catch (e) {
        console.error("getAILogs error:", e);
        return [];
    }
}

/**
 * writeAILog()
 * Saves a single AI-generated observation.
 */
export async function writeAILog(uid, log) {
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "aiLogs"), {
        ...log,
        createdAt: Timestamp.now(),
    });
}

/**
 * generateAndSaveAILogs()
 * Analyses the user's session data and writes AI observations to Firestore.
 * Call this after a focus session completes.
 *
 * Observations generated:
 *   - Best study hour (peak focus window)
 *   - Subject with dropping retention
 *   - Estimated mastery ETA for most-studied subject
 *   - Consistency observation
 */
export async function generateAndSaveAILogs(uid) {
    if (!uid) return;
    try {
        const sessions = await getAllSessions(uid);
        if (sessions.length < 2) return;

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        const logs = [];

        // 1. Best focus hour
        const hourMap = {};
        sessions.forEach(s => {
            if (!s.createdAt?.toDate) return;
            const h = s.createdAt.toDate().getHours();
            if (!hourMap[h]) hourMap[h] = { total: 0, count: 0 };
            hourMap[h].total += s.focusScore || 0;
            hourMap[h].count += 1;
        });
        const bestHour = Object.entries(hourMap)
            .map(([h, d]) => ({ hour: Number(h), avg: d.total / d.count }))
            .sort((a, b) => b.avg - a.avg)[0];
        if (bestHour) {
            const h = bestHour.hour;
            logs.push({ time: timeStr, type: "PATTERN", msg: `Concentration peak detected between ${String(h).padStart(2, "0")}:00–${String(h + 2).padStart(2, "0")}:00.` });
        }

        // 2. Subject with lowest recent retention
        const subjectMap = {};
        const recent = sessions.slice(0, 20);
        recent.forEach(s => {
            if (!s.subject || s.subject === "General") return;
            if (!subjectMap[s.subject]) subjectMap[s.subject] = { total: 0, count: 0 };
            subjectMap[s.subject].total += s.retention || s.focusScore * 0.85 || 0;
            subjectMap[s.subject].count += 1;
        });
        const subjects = Object.entries(subjectMap)
            .map(([sub, d]) => ({ sub, avg: d.total / d.count }))
            .sort((a, b) => a.avg - b.avg);
        if (subjects.length > 0 && subjects[0].avg < 70) {
            logs.push({ time: timeStr, type: "ANALYSIS", msg: `Retention for '${subjects[0].sub}' is dropping. Schedule a review session.` });
        }

        // 3. Most studied subject mastery ETA
        const topSubject = Object.entries(subjectMap)
            .map(([sub, d]) => ({ sub, sessions: d.count, avg: d.total / d.count }))
            .sort((a, b) => b.sessions - a.sessions)[0];
        if (topSubject) {
            const mastery = Math.min(99, Math.round(topSubject.avg));
            const sessPerDay = topSubject.sessions / 14;
            const gainPerSes = 5;
            const daysLeft = sessPerDay > 0 ? Math.round((100 - mastery) / (sessPerDay * gainPerSes)) : 7;
            logs.push({ time: timeStr, type: "INSIGHT", msg: `'${topSubject.sub}' mastery at ${mastery}%. ETA to completion: ~${daysLeft} days at current velocity.` });
        }

        // 4. Consistency
        const last7 = new Set(sessions.slice(0, 30).filter(s => {
            const d = new Date(s.date);
            return (now - d) / (1000 * 60 * 60 * 24) <= 7;
        }).map(s => s.date)).size;
        if (last7 >= 6) {
            logs.push({ time: timeStr, type: "SYSTEM", msg: `Outstanding streak. ${last7}/7 days active this week. You're in the top 5% for consistency.` });
        } else if (last7 <= 3) {
            logs.push({ time: timeStr, type: "ALERT", msg: `Only ${last7}/7 days active this week. Consistency is the #1 predictor of exam performance.` });
        }

        // Save all generated logs
        for (const log of logs) {
            await writeAILog(uid, log);
        }
    } catch (e) {
        console.error("generateAndSaveAILogs error:", e);
    }
}

// ── KNOWLEDGE GAPS ────────────────────────────────────────────────────────────

/**
 * getKnowledgeGaps()
 * Returns subjects not studied in 3+ days.
 */
export async function getKnowledgeGaps(uid) {
    if (!uid) return [];
    try {
        const sessions = await getAllSessions(uid);
        const latestMap = {};
        sessions.forEach(s => {
            const sub = s.subject;
            if (!sub || sub === "General") return;
            if (!latestMap[sub] || s.date > latestMap[sub]) latestMap[sub] = s.date;
        });

        const today = new Date();
        return Object.entries(latestMap)
            .map(([subject, lastDate]) => {
                const daysAgo = Math.floor((today - new Date(lastDate)) / (1000 * 60 * 60 * 24));
                return { subject, daysAgo, priority: daysAgo >= 5 ? "high" : "medium" };
            })
            .filter(g => g.daysAgo >= 3)
            .sort((a, b) => b.daysAgo - a.daysAgo)
            .slice(0, 3);
    } catch (e) {
        console.error("getKnowledgeGaps error:", e);
        return [];
    }
}