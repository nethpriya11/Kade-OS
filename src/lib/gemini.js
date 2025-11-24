import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("Gemini API key is missing! Please add VITE_GEMINI_API_KEY to your .env file.");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

export const askGemini = async (prompt) => {
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error asking Gemini:", error);
        return `Error: ${error.message || "Unknown error occurred"}. Please check your API key and model availability.`;
    }
};
