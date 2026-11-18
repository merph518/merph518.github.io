// Pairs this phone with the family TV's app guard, and answers the TV's lock-screen QR codes with a 6-digit code.
// The TV's key is kept in this browser, encrypted with a key that only this phone's passkey (fingerprint, face or
// screen lock) can produce, through the WebAuthn PRF extension. Nothing is sent anywhere: this page has no server.
const RP_ID = 'merph518.github.io';
const STORE = 'tvguard-v1';
const $ = (id) => document.getElementById(id);

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || { tvs: {} }; } catch (e) { return { tvs: {} }; }
}
function save(data) { localStorage.setItem(STORE, JSON.stringify(data)); }
function random(n) { return crypto.getRandomValues(new Uint8Array(n)); }

async function prfSalt() {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tvguard prf v1')));
}

async function createPasskey() {
  const cred = await navigator.credentials.create({ publicKey: {
    rp: { id: RP_ID, name: 'Family TV' },
    user: { id: random(16), name: 'Family TV unlock', displayName: 'Family TV unlock' },
    challenge: random(32),
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    extensions: { prf: { eval: { first: await prfSalt() } } },
  } });
  const prf = cred.getClientExtensionResults().prf;
  return { id: bytesToB64url(cred.rawId), prf: !!(prf && prf.enabled) };
}

// An AES key that only this phone's passkey can make, or null when the phone can't do PRF
async function passkeyAesKey(credId) {
  const cred = await navigator.credentials.get({ publicKey: {
    rpId: RP_ID,
    challenge: random(32),
    allowCredentials: [{ type: 'public-key', id: b64urlToBytes(credId) }],
    userVerification: 'required',
    extensions: { prf: { eval: { first: await prfSalt() } } },
  } });
  const prf = cred.getClientExtensionResults().prf;
  if (!prf || !prf.results || !prf.results.first) return null;
  return crypto.subtle.importKey('raw', prf.results.first, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function show(html) { $('main').innerHTML = html; }
function showCode(code) {
  show('<p>Type this on the TV:</p><p class="code">' + code.slice(0, 3) + ' ' + code.slice(3) + '</p>' +
    '<p class="small">It works once, for the QR code you just scanned.</p>');
}
function showError(e) {
  show('<p>That didn\'t work: ' + String(e && e.message || e).replace(/</g, '&lt;') + '</p>' +
    '<p class="small">Scan the QR code on the TV again.</p>');
}

async function pair(tvId, secret, challenge) {
  const data = load();
  if (!data.cred) {
    data.cred = await createPasskey();
    save(data);
  }
  const key = data.cred.prf ? await passkeyAesKey(data.cred.id) : null;
  if (key) {
    const iv = random(12);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, b64urlToBytes(secret));
    data.tvs[tvId] = { iv: bytesToB64url(iv), ct: bytesToB64url(ct) };
  } else {
    if (!confirm('This phone can\'t lock the TV key behind its fingerprint. Save it anyway? ' +
        'Anyone who can open this phone could then unlock the TV.')) throw new Error('not saved');
    data.tvs[tvId] = { plain: secret };
  }
  save(data);
  showCode(await tvCode(secret, tvId, challenge));
}

async function unlock(tvId, challenge) {
  const data = load();
  const entry = data.tvs[tvId];
  if (!entry) throw new Error('this phone isn\'t paired with that TV');
  let secret = entry.plain;
  if (!secret) {
    const key = await passkeyAesKey(data.cred.id);
    if (!key) throw new Error('the passkey gave no key');
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64urlToBytes(entry.iv) }, key,
      b64urlToBytes(entry.ct));
    secret = bytesToB64url(plain);
  }
  showCode(await tvCode(secret, tvId, challenge));
}

function start() {
  const hash = location.hash.slice(1);
  // Keep the pairing secret out of the address bar and history
  history.replaceState(null, '', location.pathname);
  const m = hash.match(/^([pu])=(.+)$/);
  if (!m) {
    show('<p>Scan the QR code on the TV\'s lock screen.</p>');
    return;
  }
  const parts = m[2].split('.');
  const pairing = m[1] === 'p' && parts.length === 3;
  const unlocking = m[1] === 'u' && parts.length === 2;
  if (!pairing && !unlocking) {
    show('<p>That QR code isn\'t one of the TV\'s.</p>');
    return;
  }
  show('<p>' + (pairing ? 'Pair this phone with the TV.' : 'Unlock the TV.') + '</p>' +
    '<button id="go">' + (pairing ? 'Save the key' : 'Show the code') + '</button>' +
    '<p class="small">Your phone asks for your fingerprint, face or screen lock.</p>');
  $('go').onclick = () => (pairing ? pair(parts[0], parts[1], parts[2]) : unlock(parts[0], parts[1])).catch(showError);
}

start();
