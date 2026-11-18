# merph518.github.io

The phone side of the family TV's app guard (merph518/sony-tv #11, #12). `tv/` is a static page with no server: the
TV's lock screen shows a QR code that opens it, and the page answers with a 6-digit code that a parent types with the
remote.

- Pairing (`#p=...`) gives the phone a secret it shares with the TV. The page keeps it in this browser's storage,
  encrypted with a key that only the phone's own passkey for this domain can produce (WebAuthn PRF), so the phone
  asks for a fingerprint, face or screen lock before it shows a code.
- Unlocking (`#u=...`) carries a one-time challenge; the code is an HMAC of it, the same one the TV checks.

The page loads no third-party scripts and makes no network requests (its Content-Security-Policy forbids them).
Don't rename this repository or move the domain: the phone's passkey and saved keys are tied to `merph518.github.io`.
