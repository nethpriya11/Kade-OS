const API_URL = '/api/kitchen-assistant';

export const askGemini = async (prompt: string): Promise<string> => {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data.text;
    } catch (err) {
        const error = err as Error;
        console.error("Error asking Gemini:", error);
        return `Error: ${error.message || "Unknown error occurred"}. Please check your API key and model availability.`;
    }
};

export const predictCategory = async (itemName: string, existingCategories?: string[]): Promise<string | null> => {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: itemName, type: 'category', existingCategories }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data.text;
    } catch (err) {
        const error = err as Error;
        console.error("Error predicting category:", error);
        return null;
    }
};
