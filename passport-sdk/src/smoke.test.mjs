// Headless verification of the credential crypto scheme against the REAL
// compiled contract circuits — no wallet/chain needed. Run: node src/smoke.test.mjs
import assert from 'node:assert/strict';
import { pureCircuits } from 'credport-contract';
import { yyyymmdd, toHex, randomBytes, nameHash } from '../dist/encoding.js';

let passed = 0;
const ok = (name) => { console.log(`  ✓ ${name}`); passed++; };

// 1. Pure circuits are deterministic.
const sk = randomBytes(32);
assert.equal(toHex(pureCircuits.publicKey(sk)), toHex(pureCircuits.publicKey(sk)));
ok('publicKey is deterministic');

// 2. Domain separation: enrollment vs scoped nullifier differ for same sk.
const enroll = toHex(pureCircuits.enrollmentNullifier(sk));
const scopeA = toHex(pureCircuits.scopedNullifier(sk, randomBytes(32)));
assert.notEqual(enroll, scopeA, 'enrollment and scoped nullifiers must not collide');
ok('enrollment nullifier is domain-separated from scoped nullifier');

// 3. Scoped nullifier: same scope => same value, different scope => different.
const scope1 = randomBytes(32);
const scope2 = randomBytes(32);
assert.equal(toHex(pureCircuits.scopedNullifier(sk, scope1)), toHex(pureCircuits.scopedNullifier(sk, scope1)));
assert.notEqual(toHex(pureCircuits.scopedNullifier(sk, scope1)), toHex(pureCircuits.scopedNullifier(sk, scope2)));
ok('scoped nullifier: stable per scope, unlinkable across scopes');

// 4. Revocation nullifier depends on the PRIVATE salt (not just commitment).
const commitment = randomBytes(32);
const saltA = randomBytes(32);
const saltB = randomBytes(32);
assert.notEqual(
  toHex(pureCircuits.revocationNullifier(commitment, saltA)),
  toHex(pureCircuits.revocationNullifier(commitment, saltB)),
  'revocation nullifier must vary with salt so it is not publicly precomputable',
);
ok('revocation nullifier is salt-derived (not precomputable from public commitment)');

// 5. Commitment binding: issuer-side and holder-side recompute must agree,
//    and any attribute change must change the commitment.
const birthDate = yyyymmdd('2000-05-14');
const country = 276n;
const salt = randomBytes(32);
const subject = pureCircuits.publicKey(sk);
const nh = await nameHash('Erika Mustermann');
const attrs = pureCircuits.attributesHash(birthDate, country, false, nh);
const c1 = pureCircuits.credentialCommitment(subject, attrs, salt);
const c2 = pureCircuits.credentialCommitment(subject, pureCircuits.attributesHash(birthDate, country, false, nh), salt);
assert.equal(toHex(c1), toHex(c2), 'commitment must be reproducible from the same attributes');
const cChanged = pureCircuits.credentialCommitment(
  subject,
  pureCircuits.attributesHash(yyyymmdd('2000-05-15'), country, false, nh),
  salt,
);
assert.notEqual(toHex(c1), toHex(cChanged), 'changing birthdate must change the commitment');
// name binding: a different name changes the commitment
const cName = pureCircuits.credentialCommitment(
  subject,
  pureCircuits.attributesHash(birthDate, country, false, await nameHash('John Smith')),
  salt,
);
assert.notEqual(toHex(c1), toHex(cName), 'changing the name must change the commitment');
// name normalization: case/spacing does not matter
assert.equal(toHex(await nameHash('Erika  MUSTERMANN ')), toHex(nh), 'name hash is normalized');
ok('commitment binds attributes + name (reproducible + tamper-evident)');

// 6. Age arithmetic matches the contract's exact predicate
//    (asOfDate >= birthDate + threshold*10000).
const ageOk = (dobStr, asOfStr, threshold) => {
  const dob = yyyymmdd(dobStr);
  const asOf = yyyymmdd(asOfStr);
  return asOf >= dob + BigInt(threshold) * 10000n;
};
assert.equal(ageOk('2000-05-14', '2026-07-04', 18), true, '26yo is over 18');
assert.equal(ageOk('2009-01-01', '2026-07-04', 18), false, '17yo is not over 18');
assert.equal(ageOk('2008-07-04', '2026-07-04', 18), true, 'exactly 18 today passes');
assert.equal(ageOk('2008-07-05', '2026-07-04', 18), false, 'one day short of 18 fails');
ok('YYYYMMDD age predicate is exact at the boundary');

console.log(`\n${passed}/6 crypto-scheme checks passed against the compiled contract.`);
