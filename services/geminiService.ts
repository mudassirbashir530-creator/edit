
import { GoogleGenAI, Type } from "@google/genai";
import { Corner } from "../types";

// Helper to analyze product images using Gemini to find the best corner for branding
export const findBestCorner = async (imageBase64: string): Promise<Corner> => {
  // Always use the API_KEY from process.env directly in the constructor
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        },
        {
          text: `Analyze this product image and identify which TOP corner (top-left or top-right) is better for placing a brand logo. 
          The better corner is the one with more negative space, less visual clutter, and which does not obstruct the product. 
          Respond ONLY with the corner name in JSON format.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          corner: {
            type: Type.STRING,
            description: "The identified best top corner",
          },
        },
        required: ["corner"],
      },
    },
  });

  try {
    // Access the text property directly (not a method)
    const text = response.text;
    if (!text) throw new Error("Empty response from model");
    const data = JSON.parse(text.trim());
    const corner = data.corner;
    if (corner === 'top-left' || corner === 'top-right') {
      return corner as Corner;
    }
    return 'top-right'; 
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return 'top-right'; // Fallback to top-right
  }
};
