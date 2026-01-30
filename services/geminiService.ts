
import { GoogleGenAI, Type } from "@google/genai";
import { Corner } from "../types";

export const findBestCorner = async (imageBase64: string): Promise<Corner> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure it is configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
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
            enum: ['top-left', 'top-right']
          },
        },
        required: ["corner"],
      },
    },
  });

  try {
    const data = JSON.parse(response.text);
    return data.corner as Corner;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return 'top-right'; // Fallback to top-right
  }
};
