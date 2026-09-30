import "server-only";
import { ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";

// Google Gemini für Übersetzungsentwürfe und KI-Dienstplanung. Der Schlüssel bleibt serverseitig; Prompt-Inhalte
// werden nicht geloggt.

export const GEMINI_DEFAULT_MODEL = "gemini-3.5-flash-lite";
export const geminiModel = () => process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY?.trim());

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
let clientKey = "";

function gemini() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey, httpOptions: { timeout: 120_000 } });
    clientKey = apiKey;
  }
  return client;
}

// Eine Anfrage mit JSON-Antwort nach Schema; liefert den Antworttext (JSON), sonst GeminiError.
export async function geminiJson(request: { system: string; user: string; schema: object; temperature?: number }) {
  if (!geminiConfigured()) throw new GeminiError("GEMINI_API_KEY fehlt.", 503);
  try {
    const response = await gemini().models.generateContent({
      model: geminiModel(),
      contents: request.user,
      config: {
        systemInstruction: request.system,
        temperature: request.temperature ?? 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: request.schema,
      },
    });
    if (response.promptFeedback?.blockReason) throw new GeminiError("Die KI hat die Anfrage abgelehnt.", 422);
    const text = response.text;
    if (!text) throw new GeminiError("Die KI hat keine Antwort geliefert.", 502);
    return text;
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    if (error instanceof GeminiApiError) {
      console.error("Gemini API error", error.status, error.message);
      throw new GeminiError("Die KI ist im Moment nicht erreichbar.", 502);
    }
    throw error;
  }
}
