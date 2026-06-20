import { type CSSProperties, type ReactNode } from 'react';
import { useCredport, type UseCredportOptions } from './useCredport.js';

export interface ProveAgeGateProps extends UseCredportOptions {
  /** Rendered once the user is verified. If omitted, a default ✓ panel shows. */
  children?: ReactNode;
  /** Label on the prove button. Default: "Prove I'm over {threshold}". */
  label?: string;
  /** Inline style overrides for the outer container. */
  style?: CSSProperties;
  /** Set false to ship your own styles (only structural classes are emitted). */
  unstyled?: boolean;
  className?: string;
}

const C = {
  wrap: {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    border: '1px solid rgba(127,127,127,0.25)',
    borderRadius: 14,
    padding: 20,
    maxWidth: 420,
    textAlign: 'center' as const,
    background: 'rgba(127,127,127,0.04)',
  },
  btn: {
    appearance: 'none' as const,
    border: 0,
    borderRadius: 10,
    padding: '12px 18px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    color: '#fff',
    background: 'linear-gradient(135deg,#7c6cff,#5a4fd6)',
    width: '100%',
  },
  verdict: { fontSize: 17, fontWeight: 700, margin: '6px 0' },
  small: { fontSize: 12.5, opacity: 0.7 },
  err: { color: '#e2465f', fontSize: 13, marginTop: 8 },
};

/**
 * A complete, drop-in age gate. Provide the deployed contract address and a
 * `connect()` that returns Midnight.js providers for the user's wallet; the
 * component renders a button, runs the ZK proof, and reveals `children` on a
 * green ✓. The birthdate is never transmitted — your dApp sees only the flag.
 *
 * ```tsx
 * <ProveAgeGate contractAddress={ADDR} connect={connectWallet} threshold={18}>
 *   <SecretBar />
 * </ProveAgeGate>
 * ```
 */
export function ProveAgeGate(props: ProveAgeGateProps) {
  const { children, label, style, unstyled, className, threshold = 18, ...opts } = props;
  const zk = useCredport({ ...opts, threshold });

  const busy = zk.status === 'proving' || zk.status === 'connecting';
  const s: Partial<typeof C> = unstyled ? {} : C;

  if (zk.status === 'verified') {
    return (
      <div className={className ?? 'zkp-gate zkp-verified'} style={{ ...(s.wrap ?? {}), ...style }}>
        {children ?? (
          <>
            <div style={{ fontSize: 34 }}>✅</div>
            <div className="zkp-verdict" style={s.verdict}>
              Verified — {zk.result?.threshold ?? threshold}+ ✓
            </div>
            <div className="zkp-small" style={s.small}>
              Proven in zero knowledge. No birthdate was shared.
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={className ?? 'zkp-gate'} style={{ ...(s.wrap ?? {}), ...style }}>
      <div className="zkp-verdict" style={s.verdict}>
        {threshold}+ only
      </div>
      <div className="zkp-small" style={{ ...s.small, marginBottom: 12 }}>
        Prove your age without revealing your birthdate.
      </div>
      <button
        className="zkp-btn"
        style={s.btn}
        disabled={busy}
        onClick={() => void zk.proveAgeOver(threshold)}
      >
        {busy
          ? zk.status === 'connecting'
            ? 'Connecting…'
            : 'Generating proof…'
          : (label ?? `🔒 Prove I'm over ${threshold}`)}
      </button>
      {zk.status === 'rejected' && (
        <div className="zkp-err" style={C.err}>
          Not verified{zk.result?.reason ? `: ${zk.result.reason}` : '.'}
        </div>
      )}
      {zk.error && (
        <div className="zkp-err" style={C.err}>
          {zk.error}
        </div>
      )}
    </div>
  );
}
