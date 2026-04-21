/**
 * analysisService.js
 * Firestore backend service for the Analysis page.
 *
 * Firestore structure:
 *   users/{uid}/studySessions/{sessionId}
 *     - date:       string  "YYYY-MM-DD"
 *     - subject:    string  e.g. "Data Structures"
 *     - hours:      number  e.g. 2.5
 *     - focusScore: number  0-100
 *     - retention:  number  0-100
 *     - energy:     number  0-100
 *     - createdAt:  Timestamp
 *
 *   users/{uid}/aiLogs/{logId}
 *     - time:    string  "HH:MM"
 *     - type:    string  "SYSTEM" | "ANALYSIS" | "PATTERN" | "ALERT" | "INSIGHT"
 *     - msg:     string
 *     - createdAt: Timestamp
 */

import {
    collection, addDoc, getDocs, query,
    orderBy, where, Timestamp, doc, getDoc, setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── STUDY SESSIONS ─────────────────────────────────────────────────────────

/**
 * Log a new study session for the current user.
 */
export async function logStudySession(uid, sessionData) {
    const ref = collection(db, "users", uid, "studySessions");
    await addDoc(ref, {
        ...sessionData,
        createdAt: Timestamp.now(),
    });
}

/**
 * Fetch all study sessions for a user, ordered by date descending.
 */
export async function getAllSessions(uid) {
    const ref = collection(db, "users", uid, "studySessions");
    const q = query(ref, orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Fetch sessions between two dates (inclusive).
 * @param {string} from  "YYYY-MM-DD"
 * @param {string} to    "YYYY-MM-DD"
 */
export async function getSessionsInRange(uid, from, to) {
    const ref = collection(db, "users", uid, "studySessions");
    const q = query(
        ref,
        where("date", ">=", from),
        where("date", "<=", to),
        orderBy("date", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Aggregate sessions into daily totals for charting.
 * Returns array of { date, hours, focusScore, retention, energy, sessions }
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
 * Build a heatmap-ready array of { date, hours } from sessions.
 */
export function buildHeatmap(sessions) {
    const map = {};
    sessions.forEach(s => {
        map[s.date] = (map[s.date] || 0) + (s.hours || 0);
    });
    return map; // { "2025-01-14": 3.5, ... }
}

// ── USER STATS (cached summary doc) ────────────────────────────────────────

/**
 * Get or initialise a user's stats summary doc.
 */
export async function getUserStats(uid) {
    const ref = doc(db, "users", uid, "meta", "stats");
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    // defaults
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
 * Recalculate and update stats from all sessions.
 * Call this after logging a new session.
 */
export async function recalculateStats(uid) {
    const sessions = await getAllSessions(uid);
    if (!sessions.length) return;

    const totalHours = sessions.reduce((s, x) => s + (x.hours || 0), 0);
    const avgFocusScore = Math.round(
        sessions.reduce((s, x) => s + (x.focusScore || 0), 0) / sessions.length
    );

    // Streak: count consecutive days ending today
    const today = new Date().toISOString().split("T")[0];
    const uniqueDays = [...new Set(sessions.map(s => s.date))].sort().reverse();
    let streak = 0;
    let cursor = new Date(today);
    for (const day of uniqueDays) {
        const d = cursor.toISOString().split("T")[0];
        if (day === d) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else break;
    }

    const ref = doc(db, "users", uid, "meta", "stats");
    await setDoc(ref, {
        totalHours: parseFloat(totalHours.toFixed(1)),
        avgFocusScore,
        streak,
        lastActiveDate: today,
    }, { merge: true });
}

// ── AI LOGS ─────────────────────────────────────────────────────────────────

/**
 * Fetch the last N AI log entries for the user.
 */
export async function getAILogs(uid, limitCount = 20) {
    const ref = collection(db, "users", uid, "aiLogs");
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.slice(0, limitCount).map(d => ({ id: d.id, ...d.data() })).reverse();
}

/**
 * Write a new AI log entry.
 */
export async function writeAILog(uid, log) {
    const ref = collection(db, "users", uid, "aiLogs");
    await addDoc(ref, { ...log, createdAt: Timestamp.now() });
}

// ── DATE HELPERS ────────────────────────────────────────────────────────────

export function getDateRange(mode) {
    const today = new Date();
    const fmt = d => d.toISOString().split("T")[0];
    if (mode === "week") {
        const from = new Date(today);
        from.setDate(today.getDate() - 6);
        return { from: fmt(from), to: fmt(today) };
    }
    if (mode === "month") {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: fmt(from), to: fmt(today) };
    }
    if (mode === "3months") {
        const from = new Date(today);
        from.setMonth(today.getMonth() - 3);
        return { from: fmt(from), to: fmt(today) };
    }
    // year
    const from = new Date(today.getFullYear(), 0, 1);
    return { from: fmt(from), to: fmt(today) };
}

/**
 * Fill missing dates in aggregated data with zeros so chart has no gaps.
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
 * Format a date string for chart display based on range mode.
 */
export function formatDateLabel(dateStr, mode) {
    const d = new Date(dateStr);
    if (mode === "week") return d.toLocaleDateString("en", { weekday: "short" });
    if (mode === "month") return d.getDate().toString();
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}