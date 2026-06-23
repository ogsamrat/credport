/*
 * Standalone serverless KYC endpoint for the credport demo.
 * Runs a government-ID image through Groq's vision model to extract name, date
 * of birth, and country, and checks the typed name against the document.
 * The image is processed in-memory for a single request and never stored.
 * The Groq API key lives only in this function's environment.
 */

// Node runtime globals are provided by Vercel; declared here to satisfy the
// type-checker without depending on @types/node.
declare const process: { env: Record<string, string | undefined> };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface Extracted {
  isIdDocument: boolean;
  fullName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  countryCode: number | null;
  documentType: string | null;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an identity-document verification engine for a KYC provider.
You receive an image of a government-issued ID (passport, driver's license, or national ID card) and must extract structured data.
Return ONLY a JSON object, no prose, with exactly these keys:
{
  "isIdDocument": boolean,
  "fullName": string|null,
  "dateOfBirth": string|null,
  "country": string|null,
  "countryCode": number|null,
  "documentType": string|null,
  "confidence": number
}
countryCode is the ISO 3166-1 NUMERIC code (Germany=276, USA=840, India=356, UK=826, Japan=392). dateOfBirth is ISO YYYY-MM-DD.
If the image is not a government ID, set isIdDocument=false, other fields null, confidence 0.`;

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
  if (!apiKey) {
    res.status(503).json({ error: 'Server has no GROQ_API_KEY configured.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const image: string | undefined = body.image;
  const name: string | undefined = body.name;
  if (!image || !name) {
    res.status(400).json({ error: 'Provide { image: dataURI, name: string }.' });
    return;
  }

  try {
    const groq = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Extract the identity fields from this ID. The holder claims their name is: "${name}".` },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
    });
    if (!groq.ok) {
      const text = await groq.text().catch(() => '');
      res.status(502).json({ error: `Groq API error ${groq.status}: ${text.slice(0, 200)}` });
      return;
    }
    const json = (await groq.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}') as Partial<Extracted>;

    const identity: Extracted = {
      isIdDocument: Boolean(parsed.isIdDocument),
      fullName: parsed.fullName ?? null,
      dateOfBirth: parsed.dateOfBirth ?? null,
      country: parsed.country ?? null,
      countryCode: typeof parsed.countryCode === 'number' ? parsed.countryCode : null,
      documentType: parsed.documentType ?? null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    };
    const nameMatches = namesMatch(name, identity.fullName);

    let verified = true;
    let reason: string | undefined;
    if (!identity.isIdDocument) { verified = false; reason = 'Uploaded image is not a readable government ID.'; }
    else if (!identity.dateOfBirth) { verified = false; reason = 'Could not read a date of birth from the document.'; }
    else if (!nameMatches) { verified = false; reason = `Typed name "${name}" does not match the document name "${identity.fullName ?? ''}".`; }
    else if (identity.confidence < 0.4) { verified = false; reason = 'Document could not be read with sufficient confidence.'; }

    res.status(200).json({ ...identity, nameMatches, verified, reason });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'extraction failed' });
  }
}
