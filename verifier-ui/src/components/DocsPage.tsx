import { CodeWindow } from './Code.js';
import { contractUrl } from '../lib/format.js';

const CONTRACT = '1904b5a37fdcc8eeb62a479e9924de30b51d0e227bc43b045b21806254f994ba';
const REPO = 'https://github.com/ogsamrat/credport';
const NPM = 'https://www.npmjs.com/package/credport';

const TOC: [string, string][] = [
  ['overview', 'Overview'],
  ['concepts', 'How it works'],
  ['install', 'Install'],
  ['verify', 'Verify a user'],
  ['prove', 'Prove on device'],
  ['react', 'React integration'],
  ['circuits', 'What you can prove'],
  ['deployment', 'Live deployment'],
  ['api', 'API reference'],
  ['security', 'Security notes'],
];

export function DocsPage() {
  return (
    <div className="dp">
      <header className="dp-nav">
        <div className="wrap dp-nav__in">
          <a className="brand" href="/">
            <span className="brand__word">credport</span>
            <span className="dp-nav__tag">docs</span>
          </a>
          <nav className="dp-nav__links" aria-label="Primary">
            <a href="/#try">Live demo</a>
            <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
            <a href={NPM} target="_blank" rel="noreferrer">npm</a>
          </nav>
        </div>
      </header>

      <div className="wrap dp-shell">
        <aside className="dp-toc">
          <div className="dp-toc__t">On this page</div>
          <nav>
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}`}>{label}</a>
            ))}
          </nav>
        </aside>

        <main className="dp-main">
          <section id="overview" className="dp-sec">
            <p className="kicker">Documentation</p>
            <h1 className="dp-h1">credport</h1>
            <p className="dp-lede">
              A reusable zero-knowledge identity credential on Midnight. A user verifies a real-world
              attribute once, holds the credential privately on their own device, and proves facts
              about it to any app. The app learns a single bit, <code>verified</code>, and never sees
              the name, the birthdate, or the document.
            </p>
            <div className="dp-pills">
              <a className="dp-pill" href={NPM} target="_blank" rel="noreferrer">npm i credport</a>
              <a className="dp-pill" href="/#try">Live demo</a>
              <a className="dp-pill" href={REPO} target="_blank" rel="noreferrer">Source</a>
            </div>
            <p className="dp-p">
              The verifying app needs no wallet, no proof server, and no user data. It needs only an
              indexer connection, the contract address, and a 32-byte session id. That is what makes
              credport a composable primitive rather than another siloed identity flow: one
              deployment is a network-wide resource that any number of apps consume.
            </p>
          </section>

          <section id="concepts" className="dp-sec">
            <h2 className="dp-h2">How it works</h2>
            <p className="dp-p">Three roles share one credential.</p>
            <ol className="dp-ol">
              <li>
                <strong>Issuer.</strong> After an off-chain check, the issuer attests by writing only
                an opaque commitment to the ledger. Attributes are never parameters to the contract.
              </li>
              <li>
                <strong>Holder.</strong> The name, birthdate, country, secret key, and salt live in
                the holder's private state. They become witnesses to proofs generated locally.
              </li>
              <li>
                <strong>Verifier.</strong> Any app mints a session id, hands it to the holder, and
                reads back a single verified result from the indexer.
              </li>
            </ol>
            <h3 className="dp-h3">What the chain sees, and what it never sees</h3>
            <div className="dp-tablewrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>Written to the public ledger</th>
                    <th>Never leaves the device</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Credential commitment (opaque hash)</td><td>Name, birthdate, country, document</td></tr>
                  <tr><td>Enrollment nullifier (issuer-time dedup)</td><td>The holder's secret key</td></tr>
                  <tr><td>Session id to verified result</td><td>The credential salt (commitment opening)</td></tr>
                  <tr><td>Issuer public keys, revocation nullifiers</td><td>The Merkle path used in the proof</td></tr>
                </tbody>
              </table>
            </div>
            <p className="dp-p">
              Membership is proven against a Merkle root, so a proof never reveals which credential
              produced it, and it cannot be linked back to issuance.
            </p>
          </section>

          <section id="install" className="dp-sec">
            <h2 className="dp-h2">Install</h2>
            <p className="dp-p">
              The core package pulls in the compiled Compact bindings automatically.
            </p>
            <CodeWindow file="terminal" lang="bash" code={`npm i credport
# for a React app, add the drop-in gate:
npm i credport-react credport`} />
          </section>

          <section id="verify" className="dp-sec">
            <h2 className="dp-h2">Verify a user</h2>
            <p className="dp-p">
              This is all a normal app runs. It mints a session id, hands it to the user's proving
              flow, then reads the result. It never touches a wallet, a proof server, or any personal
              data.
            </p>
            <CodeWindow
              file="verify.ts"
              lang="ts"
              code={`import { Verifier } from 'credport';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

setNetworkId('preprod');

const CONTRACT =
  '${CONTRACT}';
const verifier = Verifier.connect(CONTRACT); // indexer only

// 1. Issue a session id and hand it to the user's proving flow.
const sessionId = verifier.newSessionId();

// 2. The user proves on their own device (next section).

// 3. Read the result. You learn only whether it holds.
const { verified, threshold } = await verifier.verifyIdentity(sessionId, 18);
if (verified) grantAccess();`}
            />
            <p className="dp-note">
              <code>verifyAgeOver(sessionId, minThreshold)</code> and{' '}
              <code>verifyUniqueHuman(sessionId)</code> follow the same shape.
            </p>
          </section>

          <section id="prove" className="dp-sec">
            <h2 className="dp-h2">Prove on the holder's device</h2>
            <p className="dp-p">
              The proving side needs a connected Midnight wallet (Lace or 1AM) and its providers. The
              holder enrolls once, receives a credential from an issuer, and from then on proves
              against any session id.
            </p>
            <CodeWindow
              file="prove.ts"
              lang="ts"
              code={`import { PassportAPI, Issuer, Holder } from 'credport';

const api = await PassportAPI.join(providers, CONTRACT);

// Enroll once. The secret key never leaves the device.
const holder = new Holder(api);
const enrollment = await holder.enroll();

// The issuer attests after an off-chain check, writing only a commitment.
const issuer = new Issuer(api);
const credential = await issuer.issueCredential(
  { name: 'Erika Mustermann', birthDate: '2000-05-14', country: 276 },
  enrollment,
);
await holder.store(credential);

// Later, prove name and age together against a verifier's session id.
await holder.proveIdentity('Erika Mustermann', 18, { sessionId });`}
            />
          </section>

          <section id="react" className="dp-sec">
            <h2 className="dp-h2">React integration</h2>
            <p className="dp-p">
              <code>credport-react</code> gives you a drop-in gate. The child renders only on a
              verified result.
            </p>
            <CodeWindow
              file="Gate.tsx"
              lang="tsx"
              code={`import { ProveAgeGate } from 'credport-react';

<ProveAgeGate
  contractAddress={CONTRACT}   // one deployment serves every app
  connect={connectWallet}      // returns Midnight.js providers
  threshold={18}>
  <MembersOnly />              {/* shown only when verified */}
</ProveAgeGate>;`}
            />
            <p className="dp-p">Prefer a headless hook?</p>
            <CodeWindow
              file="useCredport.tsx"
              lang="tsx"
              code={`import { useCredport } from 'credport-react';

function Gate() {
  const zk = useCredport({ contractAddress, connect, threshold: 18 });
  return zk.status === 'verified'
    ? <SecretContent />
    : <button onClick={() => zk.proveAgeOver()} disabled={zk.status === 'proving'}>
        {zk.status === 'proving' ? 'Proving' : 'Prove 18+'}
      </button>;
}`}
            />
            <p className="dp-note">
              <code>status</code> moves through <code>idle</code>, <code>connecting</code>,{' '}
              <code>ready</code>, <code>proving</code>, then <code>verified</code> or{' '}
              <code>rejected</code>.
            </p>
          </section>

          <section id="circuits" className="dp-sec">
            <h2 className="dp-h2">What you can prove</h2>
            <div className="dp-tablewrap">
              <table className="dp-table">
                <thead>
                  <tr><th>Circuit</th><th>Proves</th><th>Discloses</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>proveIdentity</code></td>
                    <td>Name matches a claimed name and age is at least a threshold</td>
                    <td>Only the verified result</td>
                  </tr>
                  <tr>
                    <td><code>proveAgeOver</code></td>
                    <td>Age is at least a threshold, at any value you choose</td>
                    <td>Only the verified result</td>
                  </tr>
                  <tr>
                    <td><code>proveUniqueHuman</code></td>
                    <td>One credentialed human, with a per-app scoped nullifier</td>
                    <td>An unlinkable per-app pseudonym</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="dp-note">
              <code>proveResidency</code> and <code>proveAccredited</code> are architected and
              stubbed. Their attributes are already bound in the commitment, so enabling them later
              is purely additive.
            </p>
          </section>

          <section id="deployment" className="dp-sec">
            <h2 className="dp-h2">Live deployment</h2>
            <p className="dp-p">
              credport runs on Midnight preprod as a single canonical deployment. The demo and every
              example above verify against this same contract.
            </p>
            <div className="dp-kv">
              <div><span className="dp-kv__k">network</span><span className="dp-kv__v">preprod</span></div>
              <div><span className="dp-kv__k">proof server</span><span className="dp-kv__v">midnightntwrk/proof-server:8.0.3</span></div>
              <div className="dp-kv__full">
                <span className="dp-kv__k">contract</span>
                <a className="dp-kv__addr" href={contractUrl(CONTRACT)} target="_blank" rel="noreferrer">{CONTRACT}</a>
              </div>
            </div>
            <a className="btn btn--secondary btn--sm dp-btn" href={contractUrl(CONTRACT)} target="_blank" rel="noreferrer">
              Open the preprod explorer
            </a>
          </section>

          <section id="api" className="dp-sec">
            <h2 className="dp-h2">API reference</h2>

            <h3 className="dp-h3">Verifier</h3>
            <p className="dp-p">Indexer-only. No wallet, no private data.</p>
            <ul className="dp-api">
              <li><code>Verifier.connect(address)</code> connect to a deployed contract by address.</li>
              <li><code>newSessionId()</code> mint a fresh 32-byte session id.</li>
              <li><code>verifyIdentity(sessionId, minThreshold)</code> read the name-and-age result.</li>
              <li><code>verifyAgeOver(sessionId, minThreshold)</code> read the age-only result.</li>
              <li><code>verifyUniqueHuman(sessionId)</code> read the unique-human result.</li>
            </ul>

            <h3 className="dp-h3">PassportAPI</h3>
            <ul className="dp-api">
              <li><code>PassportAPI.join(providers, address)</code> attach to a contract for proving.</li>
              <li><code>PassportAPI.deploy(providers)</code> deploy a new contract (issuer becomes the caller).</li>
            </ul>

            <h3 className="dp-h3">Holder</h3>
            <ul className="dp-api">
              <li><code>new Holder(api)</code> wrap the API for the holder role.</li>
              <li><code>enroll()</code> generate the local secret and enrollment, once.</li>
              <li><code>store(credential)</code> save an issued credential to private state.</li>
              <li><code>proveIdentity(name, threshold, {'{ sessionId }'})</code> prove name and age together.</li>
              <li><code>proveAgeOver(threshold, {'{ sessionId }'})</code> prove age only.</li>
            </ul>

            <h3 className="dp-h3">Issuer</h3>
            <ul className="dp-api">
              <li><code>new Issuer(api)</code> wrap the API for the issuer role.</li>
              <li><code>issueCredential(attributes, enrollment)</code> attest, writing only a commitment.</li>
            </ul>
          </section>

          <section id="security" className="dp-sec">
            <h2 className="dp-h2">Security notes</h2>
            <ul className="dp-ul">
              <li>
                Every private attribute is read from its witness exactly once and threaded through an
                internal struct, so the value bound into the commitment is the same wire the predicate
                evaluates. Reading a witness twice would create a forge.
              </li>
              <li>
                The revocation nullifier is derived from the credential's private salt, so no observer
                can precompute it to link a proof back to issuance.
              </li>
              <li>
                The unique-human nullifier is scoped per app, so the same person shows unlinkable
                nullifiers to different apps.
              </li>
              <li>
                <code>asOfDate</code> is prover-supplied, so verifiers must reject stale or
                future-dated proofs. The bundled verifier does exactly that.
              </li>
              <li>
                Cross-enrollment sybil resistance is the issuer's job: derive the enrollment nullifier
                from a KYC-unique identifier and de-duplicate humans off-chain.
              </li>
            </ul>
          </section>

          <div className="dp-foot">
            <a className="btn btn--primary" href="/#try">Try the live demo</a>
            <a className="btn btn--secondary" href={REPO} target="_blank" rel="noreferrer">View on GitHub</a>
          </div>
        </main>
      </div>

      <footer className="foot">
        <div className="wrap foot__in">
          <span>credport, a reusable zero-knowledge credential primitive on Midnight</span>
          <span className="muted">preprod, Apache 2.0</span>
        </div>
      </footer>
    </div>
  );
}
