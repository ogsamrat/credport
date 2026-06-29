import { useState } from 'react';
import { EXPLORER } from '../lib/format.js';

const CONTRACT = '1904b5a37fdcc8eeb62a479e9924de30b51d0e227bc43b045b21806254f994ba';

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
          <div className="stepc" data-reveal>
            <div className="stepc__n">01</div>
            <h3>The issuer verifies you once</h3>
            <p>
              A KYC provider reads your government ID with a vision model, checks it against your
              name, and attests. It writes only a commitment to the chain, and never stores the
              document.
            </p>
            <div className="stepc__meta">writes a commitment</div>
          </div>
          <div className="stepc" data-reveal>
            <div className="stepc__n">02</div>
            <h3>You hold it privately</h3>
            <p>
              Your birthdate, country, and keys live in your private state. They become witnesses to
              proofs generated on your own machine. They never travel.
            </p>
            <div className="stepc__meta">holds the secret</div>
          </div>
          <div className="stepc" data-reveal>
            <div className="stepc__n">03</div>
            <h3>Any app verifies</h3>
            <p>
              An app hands you a random session id and asks for a proof. It reads back a verified
              result from the indexer, with no wallet and no access to your data.
            </p>
            <div className="stepc__meta">reads a verified result</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Why() {
  return (
    <section className="section section--paper2" id="why">
      <div className="wrap split">
        <div data-reveal>
          <p className="kicker">Why it must be on Midnight</p>
          <h2>One deployment. Every app. A single bit.</h2>
          <p>
            The passport contract is deployed once and becomes a shared primitive. Membership is
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
        <div className="codewrap" data-reveal>
          <div className="code">
            <pre><code>{`// what a verifier needs
import { Verifier } from 'credport';

const v = Verifier.connect(CONTRACT);
const session = v.newSessionId();
// hand session to the user's wallet

const { verified } =
  await v.verifyAgeOver(session, 18);
// true. No wallet. No data. One bit.`}</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="codewrap">
      <div className="code">
        <button
          className={`code__copy ${copied ? 'copied' : ''}`}
          onClick={() => void navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        >
          {copied ? 'copied' : 'copy'}
        </button>
        <pre><code>{code}</code></pre>
      </div>
    </div>
  );
}

export function Install() {
  return (
    <section className="section" id="install">
      <div className="wrap">
        <div className="section__head center" data-reveal>
          <p className="kicker">Install</p>
          <h2>Plug it into your stack.</h2>
          <p>A small, well typed surface for TypeScript and Python. Copy a block, point it at the contract, ship a gate.</p>
        </div>
        <div className="pkgs" data-reveal-group>
          <div className="pkg" data-reveal>
            <div className="pkg__top"><span className="pkg__name">credport-react</span><span className="pkg__eco">npm</span></div>
            <p className="pkg__desc">A drop in age gate for any React app.</p>
            <CodeBlock code={`npm i credport-react`} />
            <CodeBlock code={`import { ProveAgeGate } from 'credport-react';

<ProveAgeGate
  contractAddress={CONTRACT}
  connect={connectWallet}
  threshold={18}>
  <MembersOnly />
</ProveAgeGate>`} />
          </div>
          <div className="pkg" data-reveal>
            <div className="pkg__top"><span className="pkg__name">credport</span><span className="pkg__eco">npm</span></div>
            <p className="pkg__desc">The core. Issuer, Holder, Verifier.</p>
            <CodeBlock code={`npm i credport`} />
            <CodeBlock code={`const v = Verifier.connect(CONTRACT);
const session = v.newSessionId();
// user proves on their device
const { verified } =
  await v.verifyAgeOver(session, 18);`} />
          </div>
          <div className="pkg" data-reveal>
            <div className="pkg__top"><span className="pkg__name">zkpassport</span><span className="pkg__eco">pip</span></div>
            <p className="pkg__desc">Gate a Python backend on a verified result.</p>
            <CodeBlock code={`pip install zkpassport`} />
            <CodeBlock code={`from zkpassport import ZkPassport

zk = ZkPassport(CONTRACT)
session = zk.new_session()
# user proves on their device
zk.verify_age_over(session, 18).verified`} />
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
            <div className="doc__big">Issue, prove 18, verified.</div>
            <div className="doc__cta">Run it above</div>
          </a>
          <a className="doc" data-reveal href="#install">
            <div className="doc__k">packages</div>
            <div className="doc__big">npm, pip, monorepo.</div>
            <div className="doc__cta">Install and build</div>
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
          <a className="btn btn--secondary" href="#install">Read the docs</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot__in">
        <span>zkPassport, a reusable ZK credential primitive on Midnight</span>
        <span className="muted">preprod, Apache 2.0</span>
      </div>
    </footer>
  );
}
