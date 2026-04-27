/**
 * mentorService.js
 * Powers the Astra Empath-Mentor features:
 *   - Weak subject detection from quiz history
 *   - Proactive check-in messages
 *   - Reality check (burnout detection)
 */

import {
    collection, getDocs, query, orderBy,
    addDoc, serverTimestamp, doc, getDoc, setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * getWeakSubjects()
 * Returns topics where the student's avg quiz score is below 60%.
 * Used to inject context into every AI call.
 */
export async function getWeakSubjects(uid) {
    if (!uid) return [];
    try {
        const snap = await getDocs(
            query(collection(db, "users", uid, "quizResults"), orderBy("createdAt", "desc"))
        );
        const results = snap.docs.map(d => d.data());

        const topicMap = {};
        results.forEach(r => {
            if (!r.topic) return;
            if (!topicMap[r.topic]) topicMap[r.topic] = { total: 0, count: 0 };
            topicMap[r.topic].total += r.percent || 0;
            topicMap[r.topic].count += 1;
        });

        return Object.entries(topicMap)
            .map(([topic, d]) => ({ topic, avg: Math.round(d.total / d.count) }))
            .filter(t => t.avg < 60)
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 3)
            .map(t => t.topic);
    } catch (e) {
        console.error("getWeakSubjects error:", e);
        return [];
    }
}

/**
 * getProactiveMessage()
 * Checks if a proactive check-in should be shown on home page.
 * Only generates one per day — cached in Firestore.
 * Returns null if no intervention needed.
 */
export async function getProactiveMessage(uid) {
    if (!uid) return null;
    try {
        const today = new Date().toISOString().split("T")[0];
        const cacheRef = doc(db, "users", uid, "mentorCache", "proactive");
        const cached = await getDoc(cacheRef);

        // Return cached message if already generated today
        if (cached.exists() && cached.data().date === today) {
            return cached.data().message || null;
        }

        const weakSubjects = await getWeakSubjects(uid);
        if (!weakSubjects.length) return null;

        // Build message without calling AI — rule-based for speed
        const subject = weakSubjects[0];
        const message = `📊 Astra Alert: Your quiz scores in **${subject}** have been below 60%. ` +
            `A 25-minute focused review session today could prevent this from becoming an exam gap.`;

        // Cache it so it doesn't regenerate on every page load
        await setDoc(cacheRef, { date: today, message }, { merge: true });

        return message;
    } catch (e) {
        console.error("getProactiveMessage error:", e);
        return null;
    }
}

/**
 * detectBurnoutRisk()
 * Scans the user's message for unrealistic study goals (>4hrs straight).
 * Returns a warning string if risk detected, null otherwise.
 */
export function detectBurnoutRisk(message) {
    const hoursMatch = message.match(/(\d+)\s*(hour|hr|h)\b/i);
    if (!hoursMatch) return null;

    const hours = parseInt(hoursMatch[1]);
    if (hours <= 4) return null;

    return `⚠️ **Reality Check:** Studying ${hours} hours straight reduces retention by up to 40% after hour 2. ` +
        `Try **${Math.ceil(hours / 1.5)} × 50-min Pomodoro blocks** with 10-min breaks instead. ` +
        `Same content, far better recall.`;
}

// ADD at the bottom of mentorService.js

/**
 * getCareerSuggestions()
 * Generates 3 certification suggestions based on the student's most-studied topics.
 * Cached for 7 days — only regenerates on refresh or expiry.
 *
 * @param {string} uid
 * @param {{ branch: string }} userProfile
 * @returns {Promise<Array<{title, provider, duration, link}> | null>}
 */
export async function getCareerSuggestions(uid, userProfile = {}) {
    if (!uid) return null;
    try {
        const cacheRef = doc(db, "users", uid, "mentorCache", "career");
        const cached = await getDoc(cacheRef);

        // Return cached if less than 7 days old
        if (cached.exists()) {
            const savedAt = cached.data().savedAt?.toDate?.() || new Date(0);
            const ageInDays = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60 * 24);
            if (ageInDays < 7 && cached.data().suggestions?.length) {
                return cached.data().suggestions;
            }
        }

        // Get most-studied topics from quiz results
        const snap = await getDocs(
            query(collection(db, "users", uid, "quizResults"), orderBy("createdAt", "desc"))
        );
        const topics = [...new Set(snap.docs.map(d => d.data().topic).filter(Boolean))].slice(0, 5);

        if (!topics.length) return null;

        // Call /api/chat with structured output request
        const prompt = `A ${userProfile.branch || "Computer Science"} student has been studying: ${topics.join(", ")}.
Suggest exactly 3 relevant certifications. Return ONLY this JSON array, no extra text:
[
  {"title":"...","provider":"...","duration":"...","link":"https://..."},
  {"title":"...","provider":"...","duration":"...","link":"https://..."},
  {"title":"...","provider":"...","duration":"...","link":"https://..."}
]`;

        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", text: prompt }] }),
        });

        const data = await res.json();
        const raw = data.reply?.replace(/```json|```/g, "").trim() || "[]";
        const suggestions = JSON.parse(raw.startsWith("[") ? raw : "[]");

        // Cache for 7 days
        await setDoc(cacheRef, {
            suggestions,
            savedAt: serverTimestamp(),
        }, { merge: true });

        return suggestions;
    } catch (e) {
        console.error("getCareerSuggestions error:", e);
        return null;
    }
}