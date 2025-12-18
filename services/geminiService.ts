import { GoogleGenAI, Type } from "@google/genai";
import { Mission } from "../types";

// NOTE: In a real app, never expose keys in client-side code without a proxy.
// We are following the prompt instructions to use process.env.API_KEY.

let genAI: GoogleGenAI | null = null;

if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateMission = async (
  playerLocation: {x: number, y: number}, 
  wantedLevel: number, 
  currentMoney: number
): Promise<Mission | null> => {
  if (!genAI) {
    console.warn("Gemini API Key not found. Returning mock mission.");
    return {
      id: `mock-${Date.now()}`,
      title: "The Silent Heist",
      description: "We don't have a secure line (API Key missing). Go steal a blue sedan.",
      reward: 500,
      active: true,
      completed: false,
      objectiveText: "Steal a Sedan"
    };
  }

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
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
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
          required: ["title", "description", "objectiveText", "reward"]
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
    if (!genAI) return "Connection lost...";
    try {
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a street-smart fixer in React City. Keep responses short (under 20 words). Context: ${history.join('\n')} User: ${message}`,
        });
        return response.text || "...";
    } catch (e) {
        return "I can't talk right now.";
    }
}