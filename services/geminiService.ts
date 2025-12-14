import { GoogleGenAI, Type } from "@google/genai";
import { DetailLevel, Presentation } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert presentation designer and content strategist. 
Your goal is to create structured, engaging, and educational presentation content in RUSSIAN.
Focus on clarity, brevity in bullet points, and strong narrative flow.
Ensure the output is strictly valid JSON matching the requested schema.
CRITICAL: Keep bullet points concise (max 15 words per point) to ensure they fit on standard slides.
`;

const EDIT_SYSTEM_INSTRUCTION = `
You are a JSON editor for a presentation tool. 
Your task is to modify the provided JSON presentation structure based on the user's request.
- If the user asks to add a slide, add it to the 'slides' array.
- If the user asks to remove a slide, remove it.
- If the user asks to edit text, update the specific fields.
- ALWAYS return the full, valid JSON object matching the Presentation schema.
- Keep the language in RUSSIAN unless requested otherwise.
- If the request is unclear, try to infer the intent or return the original JSON if no changes are possible.
`;

export const generatePresentationContent = async (
  topic: string,
  slideCount: number,
  detailLevel: DetailLevel,
  sourceText?: string,
  includeImages: boolean = true
): Promise<Presentation> => {
  const apiKey = AIzaSyCs7KDJlhbgrOVrKHOV0vx6o6b4LNUr3MY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  let prompt = `Создай презентацию на тему: "${topic}".\n`;
  prompt += `Количество слайдов: ${slideCount}.\n`;
  
  if (sourceText && sourceText.trim().length > 0) {
    prompt += `Используй ТОЛЬКО следующий текст как источник информации для содержания:\n"""\n${sourceText}\n"""\n`;
  } else {
    prompt += `Используй свои общие знания для создания контента.\n`;
  }

  let detailInstruction = "";
  switch (detailLevel) {
    case DetailLevel.BRIEF:
      detailInstruction = "ОЧЕНЬ КРАТКО. Максимум 3 пункта на слайд. Максимум 7 слов в пункте.";
      break;
    case DetailLevel.MODERATE:
      detailInstruction = "Средняя детализация. 4-5 пунктов на слайд. Максимум 10-12 слов в пункте.";
      break;
    case DetailLevel.DETAILED:
      detailInstruction = "Подробно, но тезисно. 5-6 пунктов на слайд. Избегай огромных абзацев текста, они не поместятся на слайд.";
      break;
  }
  prompt += `Уровень детализации: ${detailInstruction}.\n`;
  prompt += `ВАЖНО: Текст не должен выходить за рамки слайда. Будь лаконичен.\n`;
  prompt += `Для каждого слайда придумай 'imageKeyword' (одно английское слово), которое описывает суть слайда для поиска картинки.\n`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainTitle: { type: Type.STRING, description: "Main title of the presentation" },
            subTitle: { type: Type.STRING, description: "Subtitle or slogan" },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "List of bullet points for the slide"
                  },
                  imageKeyword: { type: Type.STRING, description: "English keyword for image search" },
                  speakerNotes: { type: Type.STRING, description: "Notes for the speaker explaining the slide" }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    const data = JSON.parse(text);
    return { ...data, includeImages };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Не удалось сгенерировать презентацию. Пожалуйста, попробуйте снова.");
  }
};

export const updatePresentation = async (
  currentPresentation: Presentation,
  userRequest: string
): Promise<Presentation> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Remove the large base64 strings or images if they exist in memory to save tokens, 
  // though our Presentation type only holds keywords currently.
  const presentationContext = JSON.stringify(currentPresentation);

  const prompt = `
  Current Presentation JSON:
  ${presentationContext}

  User Request for changes:
  "${userRequest}"

  Return the updated JSON structure.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: EDIT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainTitle: { type: Type.STRING },
            subTitle: { type: Type.STRING },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }
                  },
                  imageKeyword: { type: Type.STRING },
                  speakerNotes: { type: Type.STRING }
                }
              }
            },
            includeImages: { type: Type.BOOLEAN }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const updatedData = JSON.parse(text);
    // Ensure we keep the user's preference for images if the AI forgot it (though schema includes it)
    return { ...updatedData, includeImages: currentPresentation.includeImages };

  } catch (error) {
    console.error("Gemini Edit Error:", error);
    throw new Error("Не удалось обновить презентацию.");
  }
};
