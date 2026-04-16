import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// This is where you "Train" the AI's personality (System Instructions)
const systemInstruction = `
  You are the StudentOS Academic Architect. 
  Your goal is to help students manage academic stress by breaking goals into 3 clear phases:
  1. Preparation (What to gather/read)
  2. Execution (The core study/work tasks)
  3. Review (How to test their knowledge)
  
  Keep responses organized, use Markdown bolding, and stay encouraging.
`;

export const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction: systemInstruction
});

export async function generatePlan(prompt) {
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return "I encountered an error while building your plan. Please try again.";
    }
}