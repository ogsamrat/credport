import { short } from '../lib/format.js';
import type { PassportController } from '../hooks/usePassport.js';

export function Nav({ ctl }: { ctl: PassportController }) {
  const { connected, session, connect, busy } = ctl;
  return (
    <header className="nav">
      <div className="nav__in wrap">
        <a className="brand" href="#top" aria-label="zkPassport home">
          <span className="brand__word">zkPassport</span>
        </a>
        <nav className="nav__links" aria-label="Primary">
          <a href="#try">Try it</a>
          <a href="#how">How it works</a>
          <a href="#why">Why Midnight</a>
          <a href="#install">Install</a>
        </nav>
        <div>
          {connected && session ? (
            <span className="wchip" title={session.shieldedCoinPublicKey}>
              <span className="live" />
              {short(session.shieldedCoinPublicKey, 5)} · {session.networkId}
            </span>
          ) : (
            <button className="btn btn--primary btn--sm" onClick={connect} disabled={busy !== null}>
              {busy === 'connect' ? <span className="spinner" /> : null}
              Connect wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
