/*
 * Client for the credport document-KYC endpoint. The issuer uploads an ID plus
 * the holder's name; a vision model reads the document server-side (the Groq key
 * never touches the browser) and returns structured attributes. The image is
 * downscaled in the browser first, both to keep the request under the serverless
 * body limit and because the model does not need full resolution. It is sent
 * once for extraction and never stored.
 */
export interface KycResult {
  isIdDocument: boolean;
  fullName: string | null;
  dateOfBirth: string | null; // YYYY-MM-DD
  countryCode: number | null;
  country: string | null;
  documentType: string | null;
  confidence: number;
  nameMatches: boolean;
  verified: boolean;
  reason?: string;
}

// The production build injects VITE_KYC_URL=/api/kyc (same origin). Local dev
// with no env falls back to the deployed function, which sends permissive CORS
// headers, so `npm run dev` works without running a separate backend.
const KYC_URL =
  (import.meta.env.VITE_KYC_URL as string | undefined) ?? 'https://credport.vercel.app/api/kyc';

/** Reads a File into a data URI. */
export const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

/**
 * Loads an image File, downscales it so the longest side is at most `maxDim`,
 * and re-encodes it as JPEG. This keeps the upload small (a full-size phone
 * photo as base64 can exceed the serverless request limit and fail to send)
 * while staying readable for the vision model. Falls back to the raw data URI
 * if the canvas path is unavailable.
 */
// Base64 payload ceiling. The serverless request body limit is ~4.5MB; stay well
// under it (base64 inflates bytes by ~37%, and there is JSON overhead too).
const MAX_DATAURI_CHARS = 2_800_000;

export async function fileToImageDataUri(file: File, maxDim = 1600): Promise<string> {
  const raw = await fileToDataUri(file);

  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = raw;
    });
  } catch {
    // Most commonly an iPhone HEIC photo, which browsers cannot decode.
    throw new Error('Could not read this image. Please upload a clear JPG or PNG (HEIC is not supported).');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return raw;

  // Encode as JPEG, shrinking dimensions and quality until comfortably under
  // the request limit, so a full-size phone photo still sends reliably.
  let scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  let quality = 0.82;
  let out = raw;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    out = canvas.toDataURL('image/jpeg', quality);
    if (out.length <= MAX_DATAURI_CHARS) return out;
    scale *= 0.8;
    quality = Math.max(0.5, quality - 0.08);
  }
  return out;
}

export async function extractIdentity(image: string, name: string): Promise<KycResult> {
  const payload = JSON.stringify({ image, name });
  if (payload.length > 4_000_000) {
    throw new Error('The image is too large to send. Please use a smaller photo (a JPG or PNG).');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(KYC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new Error('The KYC service took too long to respond. Please try again with a clearer image.');
    }
    throw new Error('Could not reach the KYC service. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `KYC service error ${res.status}.`);
  }
  return (await res.json()) as KycResult;
}
