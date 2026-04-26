/**
 * toolsService.js
 * Firestore backend for all Study Tools (AI Assistant, Notes Generator, Quiz Generator).
 *
 * Firestore Structure:
 *   users/{uid}/toolActivity/{id}
 *     - tool      : "AI Assistant" | "Notes Generator" | "Quiz Generator"
 *     - topic     : string
 *     - color     : string (hex)
 *     - time      : string (human readable)
 *     - createdAt : Timestamp
 *
 *   users/{uid}/aiChats/{chatId}
 *     - question  : string
 *     - answer    : string
 *     - createdAt : Timestamp
 *
 *   users/{uid}/savedNotes/{noteId}
 *     - topic     : string
 *     - content   : string
 *     - mode      : "text" | "image" | "pdf"
 *     - createdAt : Timestamp
 *
 *   users/{uid}/quizResults/{resultId}
 *     - topic     : string
 *     - difficulty: string
 *     - score     : number
 *     - total     : number
 *     - percent   : number
 *     - createdAt : Timestamp
 */

import {
    collection, addDoc, getDocs, query,
    orderBy, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const TOOL_COLORS = {
    "AI Assistant": "#185FA5",
    "Notes Generator": "#C9A84C",
    "Quiz Generator": "#10B981",
};

function timeAgo(date) {
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ── ACTIVITY LOG ─────────────────────────────────────────────────────────────

export async function logToolActivity(uid, tool, topic = "") {
    if (!uid) return;
    try {
        await addDoc(collection(db, "users", uid, "toolActivity"), {
            tool,
            topic: topic.slice(0, 80),
            color: TOOL_COLORS[tool] || "#185FA5",
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("logToolActivity error:", e);
    }
}

export async function getToolsActivity(uid) {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "users", uid, "toolActivity"),
            orderBy("createdAt", "desc"),
            limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            const ms = data.createdAt?.toDate?.()?.getTime() || Date.now();
            return { id: d.id, ...data, time: timeAgo(ms) };
        });
    } catch (e) {
        console.error("getToolsActivity error:", e);
        return [];
    }
}

// ── AI CHATS ─────────────────────────────────────────────────────────────────

export async function saveAIChat(uid, question, answer) {
    if (!uid) return;
    try {
        await addDoc(collection(db, "users", uid, "aiChats"), {
            question: question.slice(0, 500),
            answer: answer.slice(0, 5000),
            createdAt: serverTimestamp(),
        });
        await logToolActivity(uid, "AI Assistant", question.slice(0, 60));
    } catch (e) {
        console.error("saveAIChat error:", e);
    }
}

export async function getAIChats(uid, count = 30) {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "users", uid, "aiChats"),
            orderBy("createdAt", "asc"),
            limit(count)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("getAIChats error:", e);
        return [];
    }
}

// ── SAVED NOTES ───────────────────────────────────────────────────────────────

export async function saveNote(uid, topic, content, mode = "text") {
    if (!uid) return null;
    try {
        const ref = await addDoc(collection(db, "users", uid, "savedNotes"), {
            topic: topic.slice(0, 100),
            content: content.slice(0, 20000),
            mode,
            createdAt: serverTimestamp(),
        });
        await logToolActivity(uid, "Notes Generator", topic.slice(0, 60));
        return ref.id;
    } catch (e) {
        console.error("saveNote error:", e);
        return null;
    }
}

export async function getSavedNotes(uid) {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "users", uid, "savedNotes"),
            orderBy("createdAt", "desc"),
            limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("getSavedNotes error:", e);
        return [];
    }
}

// ── QUIZ RESULTS ──────────────────────────────────────────────────────────────

export async function saveQuizResult(uid, topic, difficulty, score, total) {
    if (!uid) return;
    try {
        await addDoc(collection(db, "users", uid, "quizResults"), {
            topic: topic.slice(0, 100),
            difficulty,
            score,
            total,
            percent: Math.round((score / total) * 100),
            createdAt: serverTimestamp(),
        });
        await logToolActivity(uid, "Quiz Generator", `${topic} (${score}/${total})`);
    } catch (e) {
        console.error("saveQuizResult error:", e);
    }
}

export async function getQuizResults(uid) {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, "users", uid, "quizResults"),
            orderBy("createdAt", "desc"),
            limit(10)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("getQuizResults error:", e);
        return [];
    }
}