import { ArrowRight, Check } from './Icons.js';

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero__grid">
        <div>
          <h1 className="display hero__title">
            Prove you're old enough.<br />
            Show <span className="em">nothing</span> else.
          </h1>
          <p className="lede hero__lede">
            Verify your name and age once with a trusted issuer, then prove them to any app on
            Midnight. The app learns a single result, <span className="ok-text">verified</span>, and
            never sees your name, your birthdate, or your document.
          </p>
        </div>

        <div className="proofcard">
          <div className="proofcard__inner">
            <div className="pv-row">
              <div className="pv-box">
                <div className="pv-lbl">you keep</div>
                <div className="pv-val hidden">1998 04 25</div>
                <div className="pv-sub">birthdate, never sent</div>
              </div>
              <div className="pv-mid">
                <ArrowRight size={18} className="pv-arrow" />
                <span>proof</span>
              </div>
              <div className="pv-box">
                <div className="pv-lbl">the app sees</div>
                <div className="pv-val pv-check">
                  <Check size={15} /> verified
                </div>
                <div className="pv-sub">and an opaque commitment</div>
              </div>
            </div>
          </div>
          <p className="proofcard__cap">The chain only ever learns the one fact you chose to prove.</p>
        </div>
      </div>
    </section>
  );
}
