/**
 * Bhashini (GoI) multilingual AI client — text translation (MT) and
 * text-to-speech (TTS). Server-only: reads BHASHINI_API_KEY /
 * BHASHINI_USER_ID from the environment and is never exposed to the browser.
 *
 * This is the *optional* enhancement layer for P4. Every call degrades
 * gracefully:
 *   - If the API key/user id are not configured we return `not_configured`.
 *   - If the network/API fails we return a reason string.
 * Callers must treat a non-ok result as "fall back" (e.g. the client uses the
 * built-in advisory library + browser SpeechSynthesis). The app is fully
 * localised and offline-capable WITHOUT Bhashini — this module simply adds
 * government-grade Indic voice/translation quality when a key is present.
 *
 * NOTE: Bhashini exposes a public, keyless REST surface for third parties
 * ("meity-auth.ulcacontrib.org") as well as the bhashini.ai API. This client
 * targets the bhashini.ai REST API:
 *   POST /v1/translate  -> translated text
 *   POST /v1/tts        -> audio bytes
 * If the deployment's endpoint/version differs, adjust the constants below.
 */

/** Result union so callers can branch without throwing. */
export type BhashiniResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_configured" | "bad_request" | "upstream" | "network"; detail?: string };

const API_BASE = "https://api.bhashini.ai";
const TTS_BASE = "https://tts.bhashini.ai";
const VERSION = "v1";
const TIMEOUT_MS = 12_000;

export function isBhashiniConfigured(): boolean {
  return Boolean(process.env.BHASHINI_API_KEY || process.env.BHASHINI_USER_ID);
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    version: VERSION,
  };
  if (process.env.BHASHINI_API_KEY) headers["X-API-KEY"] = process.env.BHASHINI_API_KEY;
  if (process.env.BHASHINI_USER_ID) headers["userId"] = process.env.BHASHINI_USER_ID;
  return headers;
}

/** Fetch wrapper with an AbortController timeout and JSON/plain dual parse. */
async function request(
  url: string,
  init: RequestInit
): Promise<{ status: number; body: ArrayBuffer }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await res.arrayBuffer();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function decode(body: ArrayBuffer): string {
  return new TextDecoder().decode(body).trim();
}

/** Translate `text` from `source` to `target` using ISO-639-1 codes. */
export async function translate(
  text: string,
  source: string,
  target: string
): Promise<BhashiniResult<string>> {
  if (!isBhashiniConfigured()) return { ok: false, reason: "not_configured" };
  if (!text?.trim()) return { ok: false, reason: "bad_request", detail: "empty text" };

  try {
    const { status, body } = await request(`${API_BASE}/${VERSION}/translate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        inputText: text,
        inputLanguage: source,
        outputLanguage: target,
      }),
    });
    if (status === 401) return { ok: false, reason: "not_configured", detail: "invalid api key" };
    if (status === 400) return { ok: false, reason: "bad_request" };
    if (status >= 500) return { ok: false, reason: "upstream", detail: `HTTP ${status}` };

    const raw = decode(body);
    // The API may return plain text or a JSON envelope; accept both.
    try {
      const parsed = JSON.parse(raw);
      const out =
        parsed?.translatedSentences?.[0] ??
        parsed?.translatedText ??
        parsed?.output?.[0] ??
        parsed?.translation ??
        parsed?.text ??
        raw;
      if (typeof out === "string" && out.trim()) return { ok: true, data: out.trim() };
    } catch {
      if (raw) return { ok: true, data: raw }; // plain text body
    }
    return { ok: false, reason: "upstream", detail: "unexpected response" };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error && err.name === "AbortError" ? "network" : "network",
      detail: err instanceof Error ? err.message : undefined,
    };
  }
}

/** Synthesize speech for `text` in the given ISO-639-1 language. */
export async function synthesizeSpeech(
  text: string,
  language: string
): Promise<BhashiniResult<{ audio: ArrayBuffer; contentType: string }>> {
  if (!isBhashiniConfigured()) return { ok: false, reason: "not_configured" };
  if (!text?.trim()) return { ok: false, reason: "bad_request", detail: "empty text" };

  const lang = language.split("-")[0]; // "mr-IN" -> "mr"

  try {
    const { status, body } = await request(`${TTS_BASE}/${VERSION}/tts`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text, language: lang, gender: "female" }),
    });
    if (status === 401) return { ok: false, reason: "not_configured", detail: "invalid api key" };
    if (status === 400) return { ok: false, reason: "bad_request" };
    if (status >= 500) return { ok: false, reason: "upstream", detail: `HTTP ${status}` };

    // Some deployments return audio bytes, others a JSON envelope with a base64 payload.
    if (body.byteLength === 0) return { ok: false, reason: "upstream", detail: "empty audio" };
    const contentTypeGuess = /^%?[A-Za-z0-9+/=]{40,}$/.test(decode(body).slice(0, 200))
      ? "json"
      : "audio";
    if (contentTypeGuess === "json") {
      try {
        const parsed = JSON.parse(decode(body));
        const b64 = parsed?.audioContent ?? parsed?.audio ?? parsed?.data;
        if (typeof b64 === "string" && b64.length > 0) {
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return { ok: true, data: { audio: bytes.buffer, contentType: "audio/mpeg" } };
        }
      } catch {
        /* fall through */
      }
      return { ok: false, reason: "upstream", detail: "no audio in json envelope" };
    }

    return { ok: true, data: { audio: body, contentType: "audio/mpeg" } };
  } catch (err) {
    return {
      ok: false,
      reason: "network",
      detail: err instanceof Error ? err.message : undefined,
    };
  }
}
