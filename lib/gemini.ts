import "server-only";
import { FinishReason, ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";

// Google Gemini für CareCore KI, Übersetzungsentwürfe und KI-Dienstplanung. Der Schlüssel bleibt serverseitig; Prompt-Inhalte
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
    throw apiFailure(error);
  }
}

// Freier Text (CareCore KI). `truncated`, wenn die Antwort an der Längengrenze abgeschnitten wurde.
export async function geminiText(request: { system: string; user: string; maxOutputTokens?: number }) {
  if (!geminiConfigured()) throw new GeminiError("GEMINI_API_KEY fehlt.", 503);
  try {
    const response = await gemini().models.generateContent({
      model: geminiModel(),
      contents: request.user,
      config: {
        systemInstruction: request.system,
        temperature: 0.3,
        maxOutputTokens: request.maxOutputTokens ?? 8192,
      },
    });
    const reason = response.candidates?.[0]?.finishReason;
    if (
      response.promptFeedback?.blockReason ||
      reason === FinishReason.SAFETY ||
      reason === FinishReason.PROHIBITED_CONTENT
    )
      throw new GeminiError("Die KI hat diese Anfrage abgelehnt. Bitte den Auftrag anders formulieren.", 422);
    return { text: (response.text ?? "").trim(), truncated: reason === FinishReason.MAX_TOKENS };
  } catch (error) {
    throw apiFailure(error);
  }
}

function apiFailure(error: unknown) {
  if (error instanceof GeminiError) return error;
  if (error instanceof GeminiApiError) {
    console.error("Gemini API error", error.status);
    if (error.status === 400 && /api key/i.test(error.message))
      return new GeminiError("Der GEMINI_API_KEY ist ungültig.", 503);
    if (error.status === 401 || error.status === 403) return new GeminiError("Der GEMINI_API_KEY ist ungültig.", 503);
    if (error.status === 429)
      return new GeminiError("Die KI ist gerade ausgelastet. Bitte in einer Minute erneut versuchen.", 429);
    return new GeminiError("Die KI ist im Moment nicht erreichbar.", 502);
  }
  return error;
}
