/*
 * Document KYC extraction via Groq's Llama 4 Scout vision model.
 *
 * The issuer's real job is to verify a real-world attribute once. Here that is
 * made concrete: the user uploads a government ID and types their name; the
 * model reads the document, extracts the structured attributes, and checks the
 * typed name against the document. Those attributes then feed credential
 * issuance — and, per Midnight's model, only a commitment ever reaches the
 * chain. The document itself is processed transiently and never stored.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ExtractedIdentity {
  /** Full name as printed on the document. */
  fullName: string | null;
  /** Date of birth, ISO 8601 (YYYY-MM-DD). */
  dateOfBirth: string | null;
  /** ISO 3166-1 numeric country code inferred from the issuing country. */
  countryCode: number | null;
  /** Human-readable issuing country. */
  country: string | null;
  /** e.g. "passport", "driver_license", "national_id". */
  documentType: string | null;
  /** Model's confidence this is a genuine, readable ID (0–1). */
  confidence: number;
  /** True when the document looks like a real ID the model could read. */
  isIdDocument: boolean;
}

export interface KycResult extends ExtractedIdentity {
  /** Whether the typed name matches the document name (fuzzy). */
  nameMatches: boolean;
  /** Overall pass/fail the issuer would gate on. */
  verified: boolean;
  /** Reason when not verified. */
  reason?: string;
}

const SYSTEM_PROMPT = `You are an identity-document verification engine for a KYC provider.
You receive an image of a government-issued ID (passport, driver's license, or national ID card) and must extract structured data.
Return ONLY a JSON object, no prose, with exactly these keys:
{
  "isIdDocument": boolean,      // true only if this is a real, readable government ID
  "fullName": string|null,      // full name exactly as printed
  "dateOfBirth": string|null,   // ISO 8601 YYYY-MM-DD
  "country": string|null,       // issuing country, human readable
  "countryCode": number|null,   // ISO 3166-1 NUMERIC code (e.g. Germany=276, USA=840, India=356, UK=826, Japan=392)
  "documentType": string|null,  // "passport" | "driver_license" | "national_id" | other
  "confidence": number          // 0..1, your confidence the extraction is correct
}
If the image is not a government ID, set isIdDocument=false and other fields to null with confidence 0.`;

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();

/** Fuzzy name match: every token of the shorter name appears in the longer. */
const namesMatch = (typed: string, onDoc: string | null): boolean => {
  if (!onDoc) return false;
  const a = normalize(typed);
  const b = normalize(onDoc);
  if (!a || !b) return false;
  if (a === b) return true;
  const at = new Set(a.split(' '));
  const bt = new Set(b.split(' '));
  const [small, big] = at.size <= bt.size ? [at, bt] : [bt, at];
  let hits = 0;
  for (const t of small) if (big.has(t) && t.length > 1) hits += 1;
  return hits >= Math.min(2, small.size);
};

export async function extractIdentity(
  imageDataUri: string,
  typedName: string,
  opts: { apiKey: string; model: string },
): Promise<KycResult> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: 0,
      max_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Extract the identity fields from this ID document. The holder claims their name is: "${typedName}".` },
            { type: 'image_url', image_url: { url: imageDataUri } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? '{}';
  let parsed: Partial<ExtractedIdentity>;
  try {
    parsed = JSON.parse(content) as Partial<ExtractedIdentity>;
  } catch {
    throw new Error('Model did not return valid JSON');
  }

  const identity: ExtractedIdentity = {
    isIdDocument: Boolean(parsed.isIdDocument),
    fullName: parsed.fullName ?? null,
    dateOfBirth: parsed.dateOfBirth ?? null,
    countryCode: typeof parsed.countryCode === 'number' ? parsed.countryCode : null,
    country: parsed.country ?? null,
    documentType: parsed.documentType ?? null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
  };

  const nameMatches = namesMatch(typedName, identity.fullName);

  let verified = true;
  let reason: string | undefined;
  if (!identity.isIdDocument) {
    verified = false;
    reason = 'Uploaded image is not a readable government ID.';
  } else if (!identity.dateOfBirth) {
    verified = false;
    reason = 'Could not read a date of birth from the document.';
  } else if (!nameMatches) {
    verified = false;
    reason = `Typed name "${typedName}" does not match the document name "${identity.fullName ?? ''}".`;
  } else if (identity.confidence < 0.4) {
    verified = false;
    reason = 'Document could not be read with sufficient confidence.';
  }

  return { ...identity, nameMatches, verified, reason };
}
