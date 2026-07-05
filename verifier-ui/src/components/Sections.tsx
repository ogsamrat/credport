import { EXPLORER } from '../lib/format.js';
import { CodeWindow } from './Code.js';

const CONTRACT = '1904b5a37fdcc8eeb62a479e9924de30b51d0e227bc43b045b21806254f994ba';

const STEPS = [
  {
    n: '01',
    title: 'The issuer verifies you once',
    body: 'A KYC provider reads your government ID with a vision model, checks it against your name, and attests. It writes only a commitment to the chain, and never stores the document.',
    meta: 'writes a commitment',
  },
  {
    n: '02',
    title: 'You hold it privately',
    body: 'Your birthdate, country, and keys live in your private state. They become witnesses to proofs generated on your own machine. They never travel.',
    meta: 'holds the secret',
  },
  {
    n: '03',
    title: 'Any app verifies',
    body: 'An app hands you a random session id and asks for a proof. It reads back a verified result from the indexer, with no wallet and no access to your data.',
    meta: 'reads a verified result',
  },
];

export function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="wrap">
        <div className="section__head center" data-reveal>
          <p className="kicker">How it works</p>
          <h2>Three roles, one credential, zero leakage.</h2>
          <p>
            Privacy is load bearing, not decorative. Midnight keeps your attributes on your own
            device, and Compact makes every value that reaches the chain explicit, so nothing leaks
            by accident.
          </p>
        </div>
        <div className="steps3" data-reveal-group>
          {STEPS.map((s) => (
            <div className="stepc" data-reveal key={s.n}>
              <div className="stepc__hd">
                <span className="stepc__n">{s.n}</span>
                <span className="stepc__rule" />
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="stepc__meta">{s.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Why() {
  return (
    <section className="section section--paper2" id="why">
      <div className="wrap split">
        <div className="split__text" data-reveal>
          <p className="kicker">Why it must be on Midnight</p>
          <h2>One deployment. Every app. A single bit.</h2>
          <p>
            The credport contract is deployed once and becomes a shared primitive. Membership is
            proven against a Merkle root, so a proof never reveals which credential it uses. Proofs
            cannot be linked back to issuance.
          </p>
          <ul className="checks">
            <li>Age today. Residency, accreditation, and unique humanity are already designed in.</li>
            <li>The revocation nullifier is derived from a private salt, so no observer can link a proof to its issuance.</li>
            <li>The unique human nullifier is scoped per app, so it cannot be correlated across services.</li>
            <li>Every secret is read once and threaded through, so a forged proof is impossible.</li>
          </ul>
        </div>
        <div className="split__code" data-reveal>
          <CodeWindow
            file="verifier.ts"
            lang="ts"
            code={`// what a verifier needs
import { Verifier } from 'credport';

const v = Verifier.connect(CONTRACT);
const session = v.newSessionId();
// hand the session to the user's wallet

const { verified } =
  await v.verifyIdentity(session, 18);
// true. No wallet. No data. One bit.`}
          />
        </div>
      </div>
    </section>
  );
}

export function Install() {
  return (
    <section className="section" id="install">
      <div className="wrap">
        <div className="section__head center" data-reveal>
          <p className="kicker">Install</p>
          <h2>Plug it into your stack.</h2>
          <p>
            A small, well typed TypeScript surface. Copy a block, point it at the contract, ship a
            gate. Full guides live in the <a href="/docs">documentation</a>.
          </p>
        </div>
        <div className="pkgs pkgs--2" data-reveal-group>
          <div className="pkg" data-reveal>
            <div className="pkg__top">
              <span className="pkg__name">credport</span>
              <span className="pkg__eco">npm</span>
            </div>
            <p className="pkg__desc">The core primitive: Issuer, Holder, and Verifier.</p>
            <CodeWindow file="terminal" lang="bash" code={`npm i credport`} />
            <CodeWindow
              file="verify.ts"
              lang="ts"
              code={`const v = Verifier.connect(CONTRACT);
const session = v.newSessionId();
// the user proves on their device
const { verified } =
  await v.verifyIdentity(session, 18);`}
            />
          </div>
          <div className="pkg" data-reveal>
            <div className="pkg__top">
              <span className="pkg__name">credport-react</span>
              <span className="pkg__eco">npm</span>
            </div>
            <p className="pkg__desc">A drop-in identity gate for any React app.</p>
            <CodeWindow file="terminal" lang="bash" code={`npm i credport-react credport`} />
            <CodeWindow
              file="Gate.tsx"
              lang="tsx"
              code={`import { ProveAgeGate } from 'credport-react';

<ProveAgeGate
  contractAddress={CONTRACT}
  connect={connectWallet}
  threshold={18}>
  <MembersOnly />
</ProveAgeGate>`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Docs() {
  return (
    <section className="section section--paper2">
      <div className="wrap">
        <div className="section__head" data-reveal>
          <p className="kicker">Live and docs</p>
          <h2>It is running on preprod right now.</h2>
        </div>
        <div className="docs" data-reveal-group>
          <a className="doc" data-reveal href={EXPLORER} target="_blank" rel="noreferrer">
            <div className="doc__k">deployed contract</div>
            <div className="doc__addr">{CONTRACT}</div>
            <div className="doc__cta">Open the preprod explorer</div>
          </a>
          <a className="doc" data-reveal href="#try">
            <div className="doc__k">demo</div>
            <div className="doc__big">Issue, prove, verified.</div>
            <div className="doc__cta">Run it above</div>
          </a>
          <a className="doc" data-reveal href="/docs">
            <div className="doc__k">documentation</div>
            <div className="doc__big">Guides and API reference.</div>
            <div className="doc__cta">Read the docs</div>
          </a>
        </div>
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section className="closing">
      <div className="wrap" data-reveal>
        <h2 className="display">Verify once. Prove anywhere. Reveal nothing.</h2>
        <p>Any app can consume this credential for a verified result.</p>
        <div className="hero__cta" style={{ justifyContent: 'center' }}>
          <a className="btn btn--primary" href="#try">Try the live demo</a>
          <a className="btn btn--secondary" href="/docs">Read the docs</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot__in">
        <span>credport, a reusable zero-knowledge credential primitive on Midnight</span>
        <span className="muted">preprod, Apache 2.0</span>
      </div>
    </footer>
  );
}
