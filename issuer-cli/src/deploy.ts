/*
 * Headless deploy of the zkPassport contract to Midnight preprod, then a full
 * on-chain smoke cycle (issue → prove age over 18 → verify) to prove the whole
 * flow works end-to-end. Writes deployment.json for the UI to consume.
 *
 * Run:  MNEMONIC="word1 word2 … word24" npm run deploy -w credport-cli
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pino from 'pino';
import { PassportAPI, Issuer, Holder, Verifier, randomBytes, toHex } from 'credport';
import { initDeployerSession, zkConfigPath } from './providers.js';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
});

const REPO_ROOT = resolve(zkConfigPath, '..', '..', '..', '..');

const main = async (): Promise<void> => {
  const mnemonic = process.env.MNEMONIC?.trim();
  if (!mnemonic || mnemonic.split(/\s+/).length < 12) {
    throw new Error('Set MNEMONIC to the wallet seed phrase (space-separated words).');
  }
  const runSmoke = process.env.SKIP_SMOKE !== '1';

  const { providers, coinPublicKey } = await initDeployerSession(logger, mnemonic);
  logger.info(`Wallet ready. coin public key: ${coinPublicKey}`);

  // Deterministic-per-run issuer key, saved so the UI/CLI can issue later.
  const issuerSecretKey = randomBytes(32);

  logger.info('Deploying passport contract to preprod…');
  const api = await PassportAPI.deploy(providers, { issuerSecretKey, logger });
  const contractAddress = api.contractAddress;
  logger.info(`✅ Deployed passport contract at: ${contractAddress}`);

  const deployment = {
    contractAddress,
    networkId: 'preprod',
    issuerSecretKey: toHex(issuerSecretKey),
    issuerPublicKey: toHex((await import('credport-contract')).pureCircuits.publicKey(issuerSecretKey)),
    deployedAt: new Date().toISOString(),
    explorer: `https://preprod.midnightexplorer.com/`,
  };
  const deploymentPath = resolve(REPO_ROOT, 'deployment.json');
  writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  // Also expose to the UI (auto-loaded at startup to prefill the address).
  const uiPath = resolve(REPO_ROOT, 'verifier-ui', 'public', 'deployment.json');
  writeFileSync(uiPath, JSON.stringify({ contractAddress, networkId: 'preprod' }, null, 2));
  logger.info(`Wrote ${deploymentPath} and verifier-ui/public/deployment.json`);

  if (!runSmoke) {
    logger.info('SKIP_SMOKE=1 set — skipping on-chain issue/prove smoke cycle.');
    logger.info('Done.');
    return;
  }

  // ---- Full on-chain smoke cycle: issue → prove age over 18 → verify --------
  logger.info('--- On-chain smoke cycle (issue → prove 18+ → verify) ---');
  const issuer = new Issuer(api);
  const holder = new Holder(api);

  const enrollment = await holder.enroll();
  logger.info(`Holder enrolled. subject pk: ${enrollment.publicKey.slice(0, 16)}…`);

  const credential = await issuer.issueCredential(
    { name: 'Erika Mustermann', birthDate: '2000-05-14', country: 276 },
    enrollment,
  );
  logger.info(`Issued credential. commitment: ${credential.commitment.slice(0, 16)}…`);
  await holder.store(credential);

  const verifier = new Verifier(api.providers.publicDataProvider, contractAddress);
  const sessionId = verifier.newSessionId();
  logger.info(`Proving age over 18 for session ${sessionId.slice(0, 16)}… (generating ZK proof)`);
  const receipt = await holder.proveAgeOver(18, { sessionId });
  logger.info(`Proof submitted. tx: ${receipt.txHash ?? 'n/a'}`);

  const result = await verifier.verifyAgeOver(sessionId, 18);
  if (!result.verified) {
    throw new Error(`On-chain verification FAILED: ${result.reason}`);
  }
  logger.info(`✅ verified ✓ — threshold ${result.threshold}, asOf ${result.asOfDate}. Chain never saw the birthdate.`);
  logger.info(`Explorer: ${deployment.explorer} (search ${contractAddress})`);
  logger.info('Done.');
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(err instanceof Error ? err.stack ?? err.message : String(err));
    process.exit(1);
  });
