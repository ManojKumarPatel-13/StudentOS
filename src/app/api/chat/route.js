import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        const { messages, systemContext } = await req.json();

        // Build dynamic system prompt from student context
        const contextBlock = systemContext ? `
Student context:
- Name: ${systemContext.name || "Student"}
- Branch: ${systemContext.branch || "Not set"}
- College: ${systemContext.college || "Not set"}
- Current streak: ${systemContext.streak ?? 0} days
- Total study hours: ${systemContext.totalHours ?? 0}hrs
- Weak subjects: ${systemContext.weakSubjects?.join(", ") || "None detected yet"}
- Active goals: ${systemContext.goals?.join(", ") || "None set"}
` : "";

        const systemInstruction = `
You are Astra, the AI mentor inside StudentOS.
You have long-term memory of this student's study history, quiz results, and goals.
Your personality: sharp, encouraging, data-driven. Never generic.
${contextBlock}
Rules:
- Keep responses concise. Use markdown bolding for key points.
- If the student sets a goal over 4 hours of straight study, warn them about burnout
  and suggest Pomodoro or spaced repetition instead.
- Always tie advice back to their actual subjects and progress when context is given.
`;

        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview",
            systemInstruction,
        });

        // Convert messages to Gemini history format
        // Last message is the new prompt — rest is history
        const history = messages.slice(0, -1).map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }],
        }));

        const latestMessage = messages[messages.length - 1]?.text || "";

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(latestMessage);
        const reply = result.response.text();

        return Response.json({ success: true, reply });

    } catch (err) {
        console.error("Chat API error:", err);
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
}