import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        const { wrongQuestion, topic, savedNoteTitles } = await req.json();
        if (!wrongQuestion) return Response.json({ success: false });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const notesBlock = savedNoteTitles?.length
            ? `The student has saved notes on these topics: ${savedNoteTitles.join(", ")}.`
            : "The student has no saved notes yet.";

        const prompt = `A student got this question wrong in a ${topic} quiz:
"${wrongQuestion}"

${notesBlock}

1. In one sentence, explain the most likely reason they got it wrong.
2. If any of their saved note topics are relevant, name the single most relevant one. Otherwise say "none".

Return ONLY this JSON:
{"reason":"...","relatedNote":"topic name or none"}`;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(raw.startsWith("{") ? raw : "{}");

        return Response.json({ success: true, ...parsed });
    } catch (err) {
        console.error("Rootcause API error:", err);
        return Response.json({ success: false });
    }
}