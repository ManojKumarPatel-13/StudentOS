export async function POST(req) {
  try {
    console.log("👉 API HIT");

    const { topic, difficulty, questions } = await req.json();

    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }

    const prompt = `
Generate ${questions} multiple choice questions on "${topic}".
Difficulty: ${difficulty}

Return ONLY JSON like this:
[
  {
    "question": "Question?",
    "options": ["A", "B", "C", "D"],
    "answer": "A"
  }
]
`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo", // ✅ stable model
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await res.json();

    console.log("🧠 FULL RESPONSE:", data);

    // 🔥 SAFE RESPONSE EXTRACTION
    let text = "";

    if (data.choices && data.choices.length > 0) {
      text = data.choices[0].message?.content || "";
    }

    if (!text) {
      throw new Error("AI returned empty response");
    }

    console.log("🧠 TEXT:", text);

    // 🔹 CLEAN JSON
    let cleaned = text.replace(/```json|```/g, "").trim();

    if (!cleaned.startsWith("[")) {
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      cleaned = cleaned.substring(start, end + 1);
    }

    let quiz;

    try {
      quiz = JSON.parse(cleaned);
    } catch (err) {
      console.log("❌ CLEANED TEXT:", cleaned);
      throw new Error("Invalid JSON from AI");
    }

    console.log("✅ QUIZ GENERATED");

    return Response.json({
      success: true,
      quiz,
    });

  } catch (err) {
    console.error("❌ ERROR:", err);

    return Response.json({
      success: false,
      error: err.message,
    });
  }
}