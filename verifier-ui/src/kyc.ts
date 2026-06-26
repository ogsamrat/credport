/*
 * Client for the zkPassport backend's Groq-powered document KYC. The issuer
 * uploads an ID + the holder's name; the model reads the document server-side
 * (the Groq key never touches the browser) and returns structured attributes.
 * The document itself is sent once for extraction and never stored.
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

// Full KYC endpoint. In production this points at the deployed serverless
// function (VITE_KYC_URL); in local dev it falls back to the standalone server.
const KYC_URL =
  (import.meta.env.VITE_KYC_URL as string | undefined) ??
  `${(import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'http://localhost:8787'}/kyc/extract`;

/** Reads a File into a data URI for transport. */
export const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

export async function extractIdentity(image: string, name: string): Promise<KycResult> {
  const res = await fetch(KYC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, name }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `KYC server error ${res.status}. Is the backend running (npm run dev -w credport-server)?`);
  }
  return (await res.json()) as KycResult;
}
