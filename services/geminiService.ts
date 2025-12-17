import { GoogleGenAI } from "@google/genai";
import { Note } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestConnections = async (currentNote: Note, allNotes: Note[]): Promise<string> => {
  try {
    const otherTitles = allNotes
        .filter(n => n.id !== currentNote.id)
        .map(n => n.title)
        .join(', ');

    const prompt = `
      You are a knowledge management assistant.
      
      Current Note Content:
      "${currentNote.content}"
      
      Available Existing Notes:
      ${otherTitles}
      
      Task:
      Suggest 3 existing notes from the list that might be relevant to the current note. 
      Also suggest one NEW note title that doesn't exist yet but would bridge a gap.
      Return the response in markdown format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No suggestions available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error fetching AI suggestions. Please check API Key.";
  }
};

export const expandNote = async (content: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Expand on the following idea with 2-3 concise paragraphs. Maintain a neutral, academic tone suitable for personal knowledge management.\n\n"${content}"`,
        });
        return response.text || "";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "";
    }
}
