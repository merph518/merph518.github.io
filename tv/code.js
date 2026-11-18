// The 6-digit unlock code: HMAC-SHA256(secret, "tvguard1|" + tvId + "|" + challenge), cut to 6 digits as HOTP
// (RFC 4226) does. The TV app computes the same (guard/.../UnlockCode.java in merph518/sony-tv).
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes) {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function tvCode(secretB64, tvId, challenge) {
  const key = await crypto.subtle.importKey('raw', b64urlToBytes(secretB64), { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']);
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key,
    new TextEncoder().encode('tvguard1|' + tvId + '|' + challenge)));
  const o = h[h.length - 1] & 0x0f;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 1000000).padStart(6, '0');
}

if (typeof module !== 'undefined') module.exports = { tvCode, b64urlToBytes, bytesToB64url };
