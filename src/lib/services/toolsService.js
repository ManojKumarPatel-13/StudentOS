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
    doc, getDoc, setDoc, increment,
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

// ADD this new function
async function updateSubjectMastery(uid, topic, newPercent) {
    if (!uid || !topic) return;
    try {
        const ref = doc(db, "users", uid, "subjectMastery", topic);
        const existing = await getDoc(ref);

        let updatedPercent;
        if (existing.exists()) {
            const old = existing.data().percent || 0;
            // Weighted average: 80% old score, 20% new score — prevents wild swings
            updatedPercent = Math.min(100, Math.round(old * 0.8 + newPercent * 0.2));
        } else {
            updatedPercent = newPercent;
        }

        const COLORS = ["#185FA5", "#C9A84C", "#10B981", "#8B5CF6", "#EF4444", "#F59E0B"];
        const colorIndex = topic.length % COLORS.length; // stable color per topic

        await setDoc(ref, {
            subject: topic,
            percent: updatedPercent,
            color: COLORS[colorIndex],
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.error("updateSubjectMastery error:", e);
    }
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
        await setDoc(
            doc(db, "users", uid, "meta", "stats"),
            { notesCount: increment(1) },
            { merge: true }
        );

        // STEP 7 — generate flashcards silently in background, don't await
        // so the save button responds instantly
        fetch("/api/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noteContent: content, topic }),
        })
            .then(r => r.json())
            .then(async data => {
                if (data.flashcards?.length) {
                    await setDoc(
                        doc(db, "users", uid, "flashcards", ref.id),
                        { topic, cards: data.flashcards, noteId: ref.id, createdAt: serverTimestamp() },
                    );
                }
            })
            .catch(e => console.error("Flashcard generation error:", e));

        return ref.id;
    } catch (e) {
        console.error("saveNote error:", e);
        return null;
    }
}

export async function findAndSaveRelatedNotes(uid, currentNoteId, currentTopic, allNotes) {
    if (!uid || !currentNoteId || allNotes.length < 2) return;
    try {
        const otherTopics = allNotes
            .filter(n => n.id !== currentNoteId)
            .map(n => n.topic)
            .slice(0, 15); // cap at 15 to stay within prompt limits

        if (!otherTopics.length) return;

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{
                    role: "user",
                    text: `A student just studied "${currentTopic}". 
From this list of their other note topics, which 3 are most conceptually related?
Topics: ${otherTopics.join(", ")}
Return ONLY a JSON array of exactly 3 topic strings from the list above. No extra text.
Example: ["Topic A","Topic B","Topic C"]`
                }]
            }),
        });

        const data = await res.json();
        const raw = data.reply?.replace(/```json|```/g, "").trim() || "[]";
        const relatedTopics = JSON.parse(raw.startsWith("[") ? raw : "[]");

        // Map topic strings back to note IDs
        const relatedNotes = allNotes
            .filter(n => relatedTopics.includes(n.topic))
            .map(n => ({ id: n.id, topic: n.topic }))
            .slice(0, 3);

        // Save related note IDs onto the current note document
        await setDoc(
            doc(db, "users", uid, "savedNotes", currentNoteId),
            { relatedNotes },
            { merge: true }
        );

        return relatedNotes;
    } catch (e) {
        console.error("findAndSaveRelatedNotes error:", e);
        return [];
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
        const percent = Math.round((score / total) * 100);
        await addDoc(collection(db, "users", uid, "quizResults"), {
            topic: topic.slice(0, 100),
            difficulty,
            score,
            total,
            percent,
            createdAt: serverTimestamp(),
        });
        await logToolActivity(uid, "Quiz Generator", `${topic} (${score}/${total})`);

        await updateSubjectMastery(uid, topic, percent);
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

export async function getRecommendedDifficulty(uid, topic) {
    if (!uid || !topic) return null;
    try {
        const snap = await getDocs(
            query(
                collection(db, "users", uid, "quizResults"),
                orderBy("createdAt", "desc")
            )
        );

        // Get last 3 attempts on this exact topic
        const topicResults = snap.docs
            .map(d => d.data())
            .filter(r => r.topic?.toLowerCase() === topic.toLowerCase())
            .slice(0, 3);

        if (!topicResults.length) return null; // No history — don't recommend

        const avg = Math.round(
            topicResults.reduce((s, r) => s + (r.percent || 0), 0) / topicResults.length
        );

        // Escalation logic: above 80% → go up one level
        const current = topicResults[0].difficulty || "Medium";
        if (avg >= 80) {
            if (current === "Easy") return { level: "Medium", reason: `You averaged ${avg}% on Easy. Time to level up.` };
            if (current === "Medium") return { level: "Hard", reason: `Crushing it at ${avg}% on Medium. Try Hard.` };
            if (current === "Hard") return { level: "Hard", reason: `${avg}% on Hard — you've mastered this topic! 🔥` };
        }

        // Below 50% → drop down
        if (avg < 50) {
            if (current === "Hard") return { level: "Medium", reason: `${avg}% on Hard. Medium will build better foundations.` };
            if (current === "Medium") return { level: "Easy", reason: `${avg}% on Medium. Reinforce with Easy first.` };
        }

        // Between 50–80% — stay at current level
        return { level: current, reason: `${avg}% avg — keep going at ${current}.` };
    } catch (e) {
        console.error("getRecommendedDifficulty error:", e);
        return null;
    }
}

export async function saveWeakAreas(uid, topic, wrongQuestions) {
    if (!uid || !topic || !wrongQuestions?.length) return;
    try {
        // Store the wrong question texts under the topic — used by quiz API next time
        await setDoc(
            doc(db, "users", uid, "weakAreas", topic.slice(0, 80)),
            {
                topic,
                questions: wrongQuestions.slice(0, 10), // cap at 10
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (e) {
        console.error("saveWeakAreas error:", e);
    }
}

export async function getWeakAreas(uid, topic) {
    if (!uid || !topic) return [];
    try {
        const snap = await getDoc(doc(db, "users", uid, "weakAreas", topic.slice(0, 80)));
        return snap.exists() ? (snap.data().questions || []) : [];
    } catch (e) {
        return [];
    }
}