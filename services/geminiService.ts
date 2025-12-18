import { GoogleGenAI, Type } from "@google/genai";
import { Mission } from "../types";

// FIX: Initializing Gemini API client as per guidelines using process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMission = async (
  playerLocation: {x: number, y: number}, 
  wantedLevel: number, 
  currentMoney: number
): Promise<Mission | null> => {
  const prompt = `
    You are a crime boss in a fictional city called React City. 
    The player is currently at grid coordinates ${Math.floor(playerLocation.x)}, ${Math.floor(playerLocation.y)}.
    Their wanted level is ${wantedLevel}/5.
    They have $${currentMoney}.
    
    Generate a short, punchy, GTA-style mission for them. 
    Keep it simple: Go here, steal this, deliver that. 
    Be gritty and direct.
  `;

  try {
    // FIX: Using recommended model 'gemini-3-flash-preview' for text tasks as per guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            objectiveText: { type: Type.STRING },
            reward: { type: Type.NUMBER }
          },
          required: ["title", "description", "objectiveText", "reward"],
          propertyOrdering: ["title", "description", "objectiveText", "reward"],
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);

    return {
      id: `mission-${Date.now()}`,
      title: data.title,
      description: data.description,
      reward: data.reward,
      active: true,
      completed: false,
      objectiveText: data.objectiveText
    };

  } catch (error) {
    console.error("Error generating mission:", error);
    return null;
  }
};

export const getChatResponse = async (history: string[], message: string) => {
    try {
        // FIX: Using recommended model 'gemini-3-flash-preview' and direct .text property access
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `You are a street-smart fixer in React City. Keep responses short (under 20 words). Context: ${history.join('\n')} User: ${message}`,
        });
        return response.text || "...";
    } catch (e) {
        return "I can't talk right now.";
    }
}
