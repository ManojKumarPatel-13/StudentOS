import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        const { noteContent, topic } = await req.json();
        if (!noteContent) return Response.json({ success: false, error: "No content" });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `From these notes on "${topic}", extract exactly 8 key concept flashcards.
Return ONLY a JSON array, no extra text:
[{"front":"question or term","back":"answer or definition"},...]

Notes:
${noteContent.slice(0, 4000)}`;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().replace(/```json|```/g, "").trim();
        const flashcards = JSON.parse(raw.startsWith("[") ? raw : "[]");

        return Response.json({ success: true, flashcards });
    } catch (err) {
        console.error("Flashcards API error:", err);
        return Response.json({ success: false, flashcards: [] });
    }
}