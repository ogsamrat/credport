import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Holder,
  Issuer,
  PassportAPI,
  Verifier,
  type CredentialFile,
  type IdentityVerificationResult,
  type ProofReceipt,
} from 'credport';
import { initializeWalletSession, type WalletSession } from '../midnight/providers.js';
import { extractIdentity, fileToImageDataUri, type KycResult } from '../kyc.js';
import { short } from '../lib/format.js';

export type LogKind = 'info' | 'ok' | 'err' | 'plain';
export interface LogLine {
  kind: LogKind;
  text: string;
  at: string;
}

// The single canonical credport deployment on preprod. The demo verifies against
// this one contract only; it never deploys a per-session contract.
const DEPLOYED_CONTRACT = '1904b5a37fdcc8eeb62a479e9924de30b51d0e227bc43b045b21806254f994ba';
// v2: the contract binds the name and adds proveIdentity, so credentials cached
// from the older age-only contract must not be reused.
const CREDFILE_KEY = 'zkpassport:credential-file:v2';

const NO_DUST_HINT =
  'This usually means your wallet holds NIGHT but no spendable DUST for fees. ' +
  'Generate tDUST from your tNIGHT in the wallet (Tokens → tNIGHT → Generate tDUST), ' +
  'wait for a DUST balance, then retry.';

const withFeeTimeout = <T,>(promise: Promise<T>, ms: number, action: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${action} timed out after ${ms / 1000}s. ${NO_DUST_HINT}`)), ms),
    ),
  ]);

export interface GateState {
  receipt: ProofReceipt;
  result: IdentityVerificationResult;
  name: string;
}

/** All zkPassport dApp logic, extracted so the UI can stay presentational. */
export function usePassport() {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [api, setApi] = useState<PassportAPI | null>(null);
  const [contractAddress, setContractAddress] = useState<string>(DEPLOYED_CONTRACT);
  const [credential, setCredential] = useState<CredentialFile | null>(() => {
    try {
      const raw = localStorage.getItem(CREDFILE_KEY);
      return raw ? (JSON.parse(raw) as CredentialFile) : null;
    } catch {
      return null;
    }
  });

  const [birthDate, setBirthDate] = useState('2000-05-14');
  const [country, setCountry] = useState('276');
  const [accredited, setAccredited] = useState(false);

  const [holderName, setHolderName] = useState('');
  const [docDataUri, setDocDataUri] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const [kyc, setKyc] = useState<KycResult | null>(null);

  // Identity proof inputs: the name to prove and the minimum age.
  const [proveName, setProveName] = useState('');
  const [threshold, setThreshold] = useState(18);

  const [isIssuer, setIsIssuer] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);

  const append = useCallback((kind: LogKind, text: string) => {
    setLog((prev) => [...prev, { kind, text, at: new Date().toLocaleTimeString() }]);
    queueMicrotask(() => logRef.current?.scrollTo({ top: 1e9 }));
  }, []);

  const issuer = useMemo(() => (api ? new Issuer(api) : null), [api]);
  const holder = useMemo(() => (api ? new Holder(api) : null), [api]);
  const verifier = useMemo(
    () => (api && session ? new Verifier(api.providers.publicDataProvider, api.contractAddress) : null),
    [api, session],
  );

  // Keep the pinned address in sync with the published deployment
  // (public/deployment.json), but never switch contracts once a session has joined.
  useEffect(() => {
    if (api) return;
    let cancelled = false;
    void fetch('/deployment.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { contractAddress?: string } | null) => {
        if (!cancelled && d?.contractAddress) setContractAddress(d.contractAddress);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api]);

  // Reconcile local state against the active contract.
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    void (async () => {
      const ps = await api.privateState();
      if (cancelled) return;
      setIsIssuer(ps.issuerSecretKey !== undefined);
      if (credential && credential.contractAddress !== api.contractAddress) {
        setCredential(null);
        localStorage.removeItem(CREDFILE_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, credential]);

  // Default the "name to prove" to the credential's own name once it exists.
  useEffect(() => {
    if (credential && !proveName) setProveName(credential.attributes.name);
  }, [credential, proveName]);

  const run = useCallback(
    async (label: string, fn: () => Promise<void>) => {
      setBusy(label);
      setError(null);
      try {
        await fn();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        append('err', msg);
        setError(msg);
      } finally {
        setBusy(null);
      }
    },
    [append],
  );

  const connect = useCallback(
    () =>
      run('connect', async () => {
        append('info', 'Connecting wallet (approve in the extension popup)…');
        const s = await initializeWalletSession();
        setSession(s);
        append('ok', `Wallet connected, ${short(s.shieldedCoinPublicKey)} on ${s.networkId}`);
        append('plain', `proof server ${s.proverServerUri} · indexer live`);
        if (contractAddress) {
          append('info', `Joining passport contract ${short(contractAddress)}…`);
          const joined = await PassportAPI.join(s.providers, contractAddress);
          setApi(joined);
          append('ok', 'Joined passport contract');
        }
      }),
    [run, append, contractAddress],
  );

  // Join the shared canonical deployment (the verification target). Joining does
  // not grant the issuer key, so a joined wallet can prove and verify but not
  // issue. To run the full flow, deploy your own contract below.
  const join = useCallback(
    () =>
      run('join', async () => {
        if (!session) return;
        append('info', `Joining the preprod deployment ${short(contractAddress)}…`);
        const joined = await PassportAPI.join(session.providers, contractAddress);
        setApi(joined);
        append('ok', 'Joined the credport deployment');
      }),
    [run, append, session, contractAddress],
  );

  // Deploy a fresh contract. The connecting wallet becomes its issuer, which is
  // what lets this demo run issue -> prove -> verify end to end in one session.
  const deploy = useCallback(
    () =>
      run('deploy', async () => {
        if (!session) return;
        append('info', 'Deploying your own credport contract to preprod (sign in your wallet)…');
        const deployed = await withFeeTimeout(PassportAPI.deploy(session.providers), 150_000, 'Deploy');
        setApi(deployed);
        setContractAddress(deployed.contractAddress);
        append('ok', `Deployed at ${deployed.contractAddress}. This wallet is now the issuer.`);
      }),
    [run, append, session],
  );

  const pickDoc = useCallback(
    async (file: File | undefined) => {
      setKyc(null);
      setError(null);
      if (!file) {
        setDocDataUri(null);
        setDocName(null);
        return;
      }
      setDocName(file.name);
      try {
        const uri = await fileToImageDataUri(file);
        setDocDataUri(uri);
        append('plain', `Image ready, ${Math.round(uri.length / 1024)} KB to send`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not read the image.';
        setDocDataUri(null);
        append('err', msg);
        setError(msg);
      }
    },
    [append],
  );

  const verifyDocument = useCallback(
    () =>
      run('kyc', async () => {
        if (!docDataUri || !holderName.trim()) return;
        append('info', 'Reading your ID with the KYC engine (Groq vision), not stored…');
        const result = await extractIdentity(docDataUri, holderName.trim());
        setKyc(result);
        if (!result.verified) {
          append('err', `Document check failed: ${result.reason}`);
          return;
        }
        if (result.dateOfBirth) setBirthDate(result.dateOfBirth);
        if (result.countryCode) setCountry(String(result.countryCode));
        append(
          'ok',
          `Document verified: ${result.fullName}, born ${result.dateOfBirth}, ${result.country} (${Math.round(result.confidence * 100)}%)`,
        );
      }),
    [run, append, docDataUri, holderName],
  );

  const issue = useCallback(
    () =>
      run('issue', async () => {
        if (!issuer || !holder) return;
        append('info', 'Enrolling holder (secret key stays on this device)…');
        const enrollment = await holder.enroll();
        append('info', 'Issuer attests → writing ONLY a commitment on-chain…');
        if (!holderName.trim()) {
          append('err', 'Enter the holder name (verify a document first) before issuing.');
          return;
        }
        const cred = await withFeeTimeout(
          issuer.issueCredential(
            { name: holderName.trim(), birthDate, country: Number(country), accredited },
            { publicKey: enrollment.publicKey, enrollmentNullifier: enrollment.enrollmentNullifier },
          ),
          150_000,
          'Issue',
        );
        append('ok', `Credential issued, commitment ${short(cred.commitment)}`);
        await holder.store(cred);
        setCredential(cred);
        setProveName(cred.attributes.name);
        localStorage.setItem(CREDFILE_KEY, JSON.stringify(cred));
        append('ok', 'Credential stored locally. The chain never saw your name or birthdate.');
      }),
    [run, append, issuer, holder, holderName, birthDate, country, accredited],
  );

  const proveIdentity = useCallback(
    (name: string, thr: number) =>
      run('prove', async () => {
        if (!holder || !verifier) return;
        setGate(null);
        const sessionId = verifier.newSessionId();
        append('info', `A verifier app issued challenge session ${short(sessionId)}`);
        append('info', `Proving name matches and age is ${thr}+, locally. This can take a minute…`);
        const receipt = await withFeeTimeout(holder.proveIdentity(name, thr, { sessionId }), 240_000, 'Prove');
        append('ok', `Proof accepted on-chain, tx ${short(receipt.txHash ?? 'n/a')}`);
        append('info', 'Verifier (indexer-only) reads the session…');
        const result = await verifier.verifyIdentity(sessionId, thr);
        setGate({ receipt, result, name });
        append(
          result.verified ? 'ok' : 'err',
          result.verified
            ? `verified. The app learned only: this is ${name}, ${thr} or over. Nothing else.`
            : `verification failed: ${result.reason ?? 'name or age did not match'}`,
        );
      }),
    [run, append, holder, verifier],
  );

  return {
    // wallet + contract
    session,
    connected: session !== null,
    connect,
    api,
    contractAddress,
    join,
    deploy,
    isIssuer,
    // kyc
    holderName,
    setHolderName,
    docName,
    pickDoc,
    verifyDocument,
    kyc,
    // attributes
    birthDate,
    setBirthDate,
    country,
    setCountry,
    accredited,
    setAccredited,
    // credential + proof
    credential,
    issue,
    proveName,
    setProveName,
    threshold,
    setThreshold,
    proveIdentity,
    gate,
    // ui state
    busy,
    error,
    log,
    logRef,
  };
}

export type PassportController = ReturnType<typeof usePassport>;
