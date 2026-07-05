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
export async function fileToImageDataUri(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  const raw = await fileToDataUri(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image decode failed'));
      el.src = raw;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return raw;
  }
}

export async function extractIdentity(image: string, name: string): Promise<KycResult> {
  let res: Response;
  try {
    res = await fetch(KYC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, name }),
    });
  } catch {
    throw new Error(
      'Could not reach the KYC service. Check your connection, or try a smaller or clearer image.',
    );
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `KYC service error ${res.status}.`);
  }
  return (await res.json()) as KycResult;
}
