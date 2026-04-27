import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// ── SYSTEM INSTRUCTION ────────────────────────────────────────────────────────
const systemInstruction = `
You are Astra, the AI mentor inside StudentOS — a student productivity OS.
You have long-term memory of the student's study history, quiz results, and goals.
Your personality: sharp, encouraging, data-driven. Never generic.

When helping with plans:
1. Preparation — what to gather or read first
2. Execution — the core study/work tasks  
3. Review — how to test the knowledge

Rules:
- Keep responses concise. Use markdown bolding for key points.
- If the student sets a goal over 4 hours of straight study, warn them about burnout
  and suggest Pomodoro or spaced repetition instead.
- Always tie advice back to their actual subjects and progress when context is given.
`;

// ── FIXED MODEL (gemini-3.1 does not exist — use 1.5-flash) ──────────────────
export const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction,
});

// ── SINGLE-TURN (used by quiz, notes API routes) ──────────────────────────────
export async function generatePlan(prompt) {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return "I encountered an error. Please try again.";
    }
}

// ── MULTI-TURN CHAT WITH MEMORY ───────────────────────────────────────────────
/**
 * startChatSession()
 * Creates a Gemini chat session that carries full conversation history.
 * Pass the last N messages from Firestore so the model has context.
 *
 * @param {Array} history - [{role: "user"|"model", parts: [{text: string}]}]
 * @returns Gemini ChatSession
 */
export function startChatSession(history = []) {
    return model.startChat({
        history,
        generationConfig: { maxOutputTokens: 1000 },
    });
}

/**
 * sendChatMessage()
 * Sends a message to an active chat session and returns the reply text.
 *
 * @param {ChatSession} session - from startChatSession()
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function sendChatMessage(session, message) {
    try {
        const result = await session.sendMessage(message);
        return result.response.text();
    } catch (error) {
        console.error("Gemini chat error:", error);
        return "I encountered an error. Please try again.";
    }
}