import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, type, existingCategories } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured. Set GEMINI_API_KEY in Vercel environment variables.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    if (type === 'category') {
      const catPrompt = `Given the item name '${prompt}', suggest a short, descriptive category. Existing categories are: ${existingCategories.join(', ')}. If it fits well, use one of these. If not, create a new appropriate category name (e.g., 'Cleaning', 'Beverage'). Return ONLY the category name.`;
      const result = await model.generateContent(catPrompt);
      const response = await result.response;
      return res.status(200).json({ text: response.text().trim() });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return res.status(200).json({ text: response.text() });
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return res.status(500).json({ error: error.message || "Unknown error occurred" });
  }
}
