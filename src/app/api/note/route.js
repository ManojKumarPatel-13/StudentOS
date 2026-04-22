export async function POST(req) {
  try {
    const { topic } = await req.json();

    if (!topic) {
      throw new Error("Topic is required");
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct:free",
          messages: [
            {
              role: "system",
              content:
                "Generate clean structured notes with headings and bullet points. Keep it simple and exam-friendly.",
            },
            {
              role: "user",
              content: topic,
            },
          ],
        }),
      }
    );

    // 🔴 IMPORTANT CHECK
    if (!response.ok) {
      const errText = await response.text();
      console.error("API ERROR:", errText);
      throw new Error("AI API failed");
    }

    const data = await response.json();

    const notes = data?.choices?.[0]?.message?.content;

    if (!notes) {
      console.log("FULL RESPONSE:", data);
      throw new Error("No response from AI");
    }

    return Response.json({
      success: true,
      notes,
    });

  } catch (err) {
    console.error("ERROR:", err);

    return Response.json({
      success: false,
      error: err.message,
    });
  }
}