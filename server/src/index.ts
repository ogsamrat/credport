/*
 * zkPassport backend.
 *
 *   POST /kyc/extract  { image, name }        -> Groq document extraction + name check
 *   POST /session                              -> { sessionId }
 *   GET  /verify/age/:sessionId?threshold=18   -> { verified, threshold, asOfDate }
 *   GET  /verify/unique/:sessionId             -> { verified, nullifier }
 *   GET  /health
 *
 * The Groq key lives only here (server-side). Uploaded documents are processed
 * in-memory and never persisted.
 */
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { extractIdentity } from './groq.js';
import { makeSessionId, verifyAgeOver, verifyUniqueHuman } from './verify.js';

const PORT = Number(process.env.PORT ?? 8787);
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
const DEFAULT_CONTRACT = process.env.PASSPORT_CONTRACT_ADDRESS ?? '';

const app = Fastify({ bodyLimit: 15 * 1024 * 1024, logger: true });
await app.register(cors, { origin: true });

app.get('/health', async () => ({
  ok: true,
  groqConfigured: Boolean(GROQ_API_KEY),
  model: GROQ_MODEL,
  contract: DEFAULT_CONTRACT || null,
}));

app.post<{ Body: { image?: string; name?: string } }>('/kyc/extract', async (req, reply) => {
  const { image, name } = req.body ?? {};
  if (!image || !name) {
    return reply.code(400).send({ error: 'Provide { image: dataURI, name: string }.' });
  }
  if (!GROQ_API_KEY) {
    return reply.code(503).send({ error: 'Server has no GROQ_API_KEY configured.' });
  }
  try {
    const result = await extractIdentity(image, name, { apiKey: GROQ_API_KEY, model: GROQ_MODEL });
    return result;
  } catch (e) {
    req.log.error(e);
    return reply.code(502).send({ error: e instanceof Error ? e.message : 'extraction failed' });
  }
});

app.post('/session', async () => ({ sessionId: makeSessionId() }));

const resolveContract = (q: unknown): string => {
  const c = (q as { contract?: string })?.contract;
  return c || DEFAULT_CONTRACT;
};

app.get<{ Params: { sessionId: string }; Querystring: { threshold?: string; contract?: string } }>(
  '/verify/age/:sessionId',
  async (req, reply) => {
    const contract = resolveContract(req.query);
    if (!contract) return reply.code(400).send({ error: 'No contract address (set PASSPORT_CONTRACT_ADDRESS or ?contract=).' });
    const threshold = Number(req.query.threshold ?? 18);
    try {
      return await verifyAgeOver(contract, req.params.sessionId, threshold);
    } catch (e) {
      req.log.error(e);
      return reply.code(502).send({ verified: false, reason: e instanceof Error ? e.message : 'verify failed' });
    }
  },
);

app.get<{ Params: { sessionId: string }; Querystring: { contract?: string } }>(
  '/verify/unique/:sessionId',
  async (req, reply) => {
    const contract = resolveContract(req.query);
    if (!contract) return reply.code(400).send({ error: 'No contract address.' });
    try {
      return await verifyUniqueHuman(contract, req.params.sessionId);
    } catch (e) {
      req.log.error(e);
      return reply.code(502).send({ verified: false, reason: e instanceof Error ? e.message : 'verify failed' });
    }
  },
);

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info(`zkPassport server on :${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
