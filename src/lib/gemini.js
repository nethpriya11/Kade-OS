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

export const predictCategory = async (itemName, existingCategories) => {
    try {
        const prompt = `Given the item name '${itemName}', suggest a short, descriptive category. Existing categories are: ${existingCategories.join(', ')}. If it fits well, use one of these. If not, create a new appropriate category name (e.g., 'Cleaning', 'Beverage'). Return ONLY the category name.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean up response (remove extra whitespace/newlines)
        return text.trim();
    } catch (error) {
        console.error("Error predicting category:", error);
        return null;
    }
};
