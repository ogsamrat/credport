import type { PassportController } from '../hooks/usePassport.js';
import { EXPLORER, short } from '../lib/format.js';
import { Check, Lock, Upload, Wallet } from './Icons.js';

function Stepper({ ctl }: { ctl: PassportController }) {
  const verified = ctl.gate?.result.verified ?? false;
  const items = [
    ['1', 'Contract', ctl.api ? 'done' : ctl.connected ? 'active' : ''],
    ['2', 'Credential', ctl.credential ? 'done' : ctl.api ? 'active' : ''],
    ['3', 'Proof', verified ? 'done' : ctl.credential ? 'active' : ''],
  ] as const;
  return (
    <div className="stepper">
      {items.map(([n, label, state], i) => (
        <span key={n} style={{ display: 'contents' }}>
          <span className={`stepper__i ${state}`}>
            <span className="b">{state === 'done' ? <Check size={11} /> : n}</span>
            {label}
          </span>
          {i < items.length - 1 && <span className="stepper__line" />}
        </span>
      ))}
    </div>
  );
}

function ContractPanel({ ctl }: { ctl: PassportController }) {
  const busy = ctl.busy;
  const address = ctl.api?.contractAddress ?? ctl.contractAddress;
  return (
    <div className="panel">
      <div className="panel__top">
        <span className="panel__n">01</span>
        <span className="panel__title">credport contract</span>
        {ctl.api && <span className="panel__done tag ok">joined</span>}
      </div>
      <p className="panel__desc">
        One deployment is a shared primitive. Every session verifies against this same contract on preprod.
      </p>
      <div className="result">
        <div className="kv"><span className="k">address </span>{address}</div>
      </div>
      {ctl.api ? (
        <a className="btn btn--secondary btn--sm" style={{ marginTop: 12 }} href={EXPLORER} target="_blank" rel="noreferrer">
          View on the explorer
        </a>
      ) : (
        <button className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={() => ctl.join()} disabled={busy !== null}>
          {busy === 'join' ? <span className="spinner" /> : null}Join the preprod deployment
        </button>
      )}
    </div>
  );
}

function CredentialPanel({ ctl }: { ctl: PassportController }) {
  const locked = !ctl.api;
  const busy = ctl.busy;
  const kyc = ctl.kyc;
  return (
    <div className={`panel ${locked ? 'locked' : ''}`}>
      <div className="panel__top">
        <span className="panel__n">02</span>
        <span className="panel__title">Get verified</span>
        {ctl.credential && <span className="panel__done tag ok">issued</span>}
      </div>
      <p className="panel__desc">
        The issuer reads your ID with a vision model, then attests. Only a commitment reaches the chain.
      </p>

      {!ctl.credential && (
        <>
          <span className="tag" style={{ marginBottom: 10 }}>Document check, powered by Groq vision</span>
          <label className="field">Full name, as printed on your ID</label>
          <input type="text" placeholder="e.g. Erika Mustermann" value={ctl.holderName} onChange={(e) => ctl.setHolderName(e.target.value)} disabled={locked} />
          <label className="field">Government ID, processed once and never stored</label>
          <div className={`drop ${ctl.docName ? 'has' : ''}`}>
            <input type="file" accept="image/*" disabled={locked} onChange={(e) => void ctl.pickDoc(e.target.files?.[0])} />
            <div className="drop__ico">{ctl.docName ? <Check size={18} /> : <Upload size={18} />}</div>
            <div className="drop__t">{ctl.docName ?? 'Click to upload an ID image'}</div>
            <div className="drop__s">PNG or JPG, passport, licence, national ID</div>
          </div>
          <button className="btn btn--secondary btn--block" style={{ marginTop: 12 }} onClick={ctl.verifyDocument}
            disabled={locked || !ctl.docName || !ctl.holderName.trim() || busy !== null}>
            {busy === 'kyc' ? <span className="spinner" /> : null}Verify document
          </button>

          {kyc && (
            <div className={`result ${kyc.verified ? 'ok' : 'bad'}`}>
              <span className={`tag ${kyc.verified ? 'ok' : 'alert'}`}>{kyc.verified ? 'document verified' : 'not verified'}</span>
              {kyc.verified ? (
                <div className="kv">
                  <span className="k">name </span>{kyc.fullName}<br />
                  <span className="k">born </span>{kyc.dateOfBirth}<span className="k"> · {kyc.country}</span>
                </div>
              ) : (
                <div style={{ marginTop: 8, color: 'var(--ink-2)' }}>{kyc.reason}</div>
              )}
            </div>
          )}

          <div className="row2" style={{ marginTop: 16 }}>
            <div>
              <label className="field" style={{ marginTop: 0 }}>Date of birth</label>
              <input type="date" value={ctl.birthDate} onChange={(e) => ctl.setBirthDate(e.target.value)} disabled={locked} />
            </div>
            <div>
              <label className="field" style={{ marginTop: 0 }}>Country</label>
              <select value={ctl.country} onChange={(e) => ctl.setCountry(e.target.value)} disabled={locked}>
                <option value="276">Germany (276)</option>
                <option value="840">United States (840)</option>
                <option value="826">United Kingdom (826)</option>
                <option value="356">India (356)</option>
                <option value="392">Japan (392)</option>
              </select>
            </div>
          </div>

          <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={ctl.issue} disabled={locked || !ctl.isIssuer || busy !== null}>
            {busy === 'issue' ? <span className="spinner" /> : null}Issue credential
          </button>
          {ctl.api && !ctl.isIssuer && (
            <p className="panel__desc" style={{ marginTop: 10 }}>
              This wallet joined but is not the issuer, so it cannot mint credentials. Only the deployer holds the issuer key.
            </p>
          )}
        </>
      )}

      {ctl.credential && (
        <div className="result ok">
          <span className="tag ok">credential in private state</span>
          <div className="kv"><span className="k">commitment </span>{short(ctl.credential.commitment, 12)}</div>
          <div style={{ marginTop: 6, color: 'var(--ink-2)', fontSize: '0.8rem' }}>Ready to prove. The chain never saw your birthdate.</div>
        </div>
      )}
    </div>
  );
}

function ProofPanel({ ctl }: { ctl: PassportController }) {
  const locked = !ctl.credential;
  const busy = ctl.busy;
  const verified = ctl.gate?.result.verified ?? false;
  return (
    <div className={`panel ${locked ? 'locked' : ''}`}>
      <div className="panel__top">
        <span className="panel__n">03</span>
        <span className="panel__title">The verifying app</span>
        {verified && <span className="panel__done tag ok">verified</span>}
      </div>
      <p className="panel__desc">
        A separate verifier with no wallet and no private data. It asks you to confirm a name and a
        minimum age, then reads back only whether both hold.
      </p>

      {!verified && (
        <div className="row2" style={{ marginBottom: 16 }}>
          <div style={{ flex: 2 }}>
            <label className="field" style={{ marginTop: 0 }}>Name to confirm</label>
            <input type="text" value={ctl.proveName} onChange={(e) => ctl.setProveName(e.target.value)} disabled={locked} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="field" style={{ marginTop: 0 }}>Minimum age</label>
            <input
              type="text"
              inputMode="numeric"
              value={String(ctl.threshold)}
              onChange={(e) => ctl.setThreshold(Math.max(0, Math.min(120, Number(e.target.value.replace(/\D/g, '')) || 0)))}
              disabled={locked}
            />
          </div>
        </div>
      )}

      <div className={`gate ${verified ? 'open' : ''}`}>
        <div className="gate__mark">{verified ? <Check size={22} /> : <Lock size={20} />}</div>
        <div className="gate__title">
          {verified ? `Verified: ${ctl.gate!.name}, ${ctl.gate!.result.threshold}+` : 'Confirm name and age'}
        </div>
        <div className="gate__sub">
          {verified
            ? `session ${short(ctl.gate!.receipt.sessionId, 6)}. The app learned only these two facts.`
            : 'Prove your name matches and you meet the age, revealing neither value.'}
        </div>
        {!verified && (
          <button
            className="btn btn--primary"
            onClick={() => ctl.proveIdentity(ctl.proveName.trim(), ctl.threshold)}
            disabled={locked || busy !== null || !ctl.proveName.trim()}
          >
            {busy === 'prove' ? <span className="spinner" /> : null}Prove identity
          </button>
        )}
        {verified && ctl.gate?.receipt.txHash && (
          <div className="gate__tx">
            proof tx <a href={EXPLORER} target="_blank" rel="noreferrer">{short(ctl.gate.receipt.txHash, 12)}</a>
          </div>
        )}
      </div>
    </div>
  );
}

function Receipt({ ctl }: { ctl: PassportController }) {
  const commit = ctl.credential ? short(ctl.credential.commitment, 8) : 'not yet';
  const dob = ctl.credential ? String(ctl.credential.attributes.birthDate) : 'hidden';
  return (
    <div className="panel">
      <div className="receipt__title">privacy receipt</div>
      <div className="receipt__cols">
        <div>
          <div className="receipt__ct pub">on the public chain</div>
          <ul>
            <li>commitment <code>{commit}</code></li>
            <li>enrollment nullifier</li>
            <li>session, verified</li>
            <li>issuer public key</li>
          </ul>
        </div>
        <div>
          <div className="receipt__ct priv">stays on your device</div>
          <ul>
            <li>your legal name</li>
            <li>birthdate <code>{dob}</code></li>
            <li>country, accreditation</li>
            <li>the ID document</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ActivityLog({ ctl }: { ctl: PassportController }) {
  return (
    <div className="log">
      <div className="log__bar">
        <span className="d" /><span className="d" /><span className="d" />
        <span className="t">ACTIVITY</span>
      </div>
      <div className="log__body" ref={ctl.logRef}>
        {ctl.log.length === 0 && <div className="log__empty">Connect your wallet to begin.</div>}
        {ctl.log.map((l, i) => (
          <div className="ln" key={i}>
            <span className="ts">{l.at.slice(0, 8)}</span>
            <span className={l.kind}>{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Console({ ctl }: { ctl: PassportController }) {
  return (
    <section className="section section--paper2" id="try">
      <div className="wrap">
        <div className="section__head" data-reveal>
          <p className="kicker">Try it, on preprod</p>
          <h2>Issue a credential, then prove your name and age.</h2>
          <p>
            The real end to end flow, on chain. Connect a Midnight wallet, verify an ID, and watch a
            result turn green while your birthdate stays on this device.
          </p>
        </div>

        <div className="console__bar" data-reveal>
          <div className="console__status">
            <span className={`tag ${ctl.connected ? 'ok' : ''}`}>{ctl.connected ? 'preprod, connected' : 'preprod, not connected'}</span>
            <span>proof server localhost:6300</span>
          </div>
          {!ctl.connected && (
            <button className="btn btn--primary btn--sm" onClick={ctl.connect} disabled={ctl.busy !== null}>
              {ctl.busy === 'connect' ? <span className="spinner" /> : null}Connect wallet
            </button>
          )}
        </div>

        {ctl.error && <div className="banner">{ctl.error}</div>}

        {!ctl.connected ? (
          <div className="connect-card" data-reveal>
            <span className="connect-card__ico"><Wallet size={20} /></span>
            <h3>Connect a Midnight wallet</h3>
            <p>Use Lace or 1AM with the DApp Connector, set to preprod with the local proof server. You will need a small DUST balance for fees.</p>
            <button className="btn btn--primary" onClick={ctl.connect} disabled={ctl.busy !== null}>
              {ctl.busy === 'connect' ? <span className="spinner" /> : null}Connect wallet
            </button>
          </div>
        ) : (
          <>
            <Stepper ctl={ctl} />
            <div className="console__grid" data-reveal>
              <div className="flowcol">
                <ContractPanel ctl={ctl} />
                <CredentialPanel ctl={ctl} />
                <ProofPanel ctl={ctl} />
              </div>
              <div className="sidecol">
                <Receipt ctl={ctl} />
                <ActivityLog ctl={ctl} />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
